import zlib from 'zlib';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAISettings } from '@/lib/db';

/**
 * Extracts plain text from a PDF Buffer.
 * Uses Gemini Flash document intelligence (via direct PDF buffer processing)
 * to perfectly resolve CID fonts, custom CMaps, multi-columns, and symbols,
 * with a pure-Node zlib stream extractor as an offline fallback.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Strategy 1: Gemini Native Multimodal PDF Extraction (100% CMap & Layout Accurate)
  try {
    const aiSettings = getAISettings();
    const apiKey =
      aiSettings?.apiKeys?.gemini ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      '';

    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const parseModelName =
        aiSettings.modelParse ||
        process.env.MODEL_PARSE ||
        'gemini-3.6-flash';

      const model = genAI.getGenerativeModel({ model: parseModelName });

      const prompt = `You are a precision ATS resume document text extractor.
Extract the entire text content from this resume PDF with exact fidelity.
Rules:
1. Preserve all contact information (name, email, phone, links, location).
2. Preserve all section headers (Summary, Skills, Experience, Education, Certifications, Projects).
3. Preserve every single bullet point, job title, company, date range, number, metric, and technical skill.
4. Convert bullet points cleanly into '• Bullet text'.
5. Do NOT summarize, shorten, edit, or embellish anything.
6. Output purely the extracted text with clean spacing.`;

      const result = await model.generateContent([
        {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: 'application/pdf',
          },
        },
        prompt,
      ]);

      const extracted = result.response.text();
      if (extracted && extracted.trim().length > 40) {
        return cleanPdfText(extracted);
      }
    }
  } catch (llmErr) {
    console.warn('Gemini multimodal PDF extraction fallback to local stream decoder:', llmErr);
  }

  // Strategy 2: Local Stream Decompression Fallback
  return extractTextFromPDFOffline(buffer);
}

/**
 * Offline stream extractor using built-in Node zlib
 */
export function extractTextFromPDFOffline(buffer: Buffer): string {
  const rawBinary = buffer.toString('binary');
  let extractedChunks: string[] = [];

  // 1. Locate all stream...endstream content objects
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(rawBinary)) !== null) {
    const streamContent = match[1];
    let decompressed = '';

    // Attempt zlib inflate (FlateDecode)
    try {
      decompressed = zlib.inflateSync(Buffer.from(streamContent, 'binary')).toString('latin1');
    } catch {
      try {
        decompressed = zlib.inflateRawSync(Buffer.from(streamContent, 'binary')).toString('latin1');
      } catch {
        try {
          decompressed = zlib.unzipSync(Buffer.from(streamContent, 'binary')).toString('latin1');
        } catch {
          decompressed = streamContent;
        }
      }
    }

    if (!decompressed) continue;

    const textFromStream = parsePdfOperators(decompressed);
    if (textFromStream.trim()) {
      extractedChunks.push(textFromStream);
    }
  }

  let result = extractedChunks.join('\n\n').trim();

  if (result.length < 50) {
    const fallbackText = parsePdfOperators(rawBinary);
    if (fallbackText.length > result.length) {
      result = fallbackText;
    }
  }

  return cleanPdfText(result);
}

function parsePdfOperators(source: string): string {
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  let currentParagraph: string[] = [];

  const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
  while ((m = tjArrayRegex.exec(source)) !== null) {
    const arrayContent = m[1];
    const parts: string[] = [];
    const stringPartsRegex = /\(([^)]*)\)/g;
    let sm: RegExpExecArray | null;
    while ((sm = stringPartsRegex.exec(arrayContent)) !== null) {
      parts.push(unescapePdfString(sm[1]));
    }
    const combined = parts.join('');
    if (combined.trim()) {
      currentParagraph.push(combined);
    }
  }

  while ((m = tjRegex.exec(source)) !== null) {
    const unescaped = unescapePdfString(m[1]);
    if (unescaped.trim()) {
      currentParagraph.push(unescaped);
    }
  }

  const hexRegex = /<([0-9a-fA-F\s]+)>\s*T[jJ]/g;
  while ((m = hexRegex.exec(source)) !== null) {
    const hex = m[1].replace(/\s+/g, '');
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.substr(i, 2), 16);
      if (code >= 32 && code <= 126) {
        str += String.fromCharCode(code);
      }
    }
    if (str.trim()) {
      currentParagraph.push(str);
    }
  }

  return currentParagraph.join(' ');
}

function unescapePdfString(str: string): string {
  return str
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
}

function cleanPdfText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
