import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { extractTextFromPDF } from '@/lib/engine/pdfExtractor';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'doc', 'txt']);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size exceeds maximum permitted limit of 10MB.' },
        { status: 413 }
      );
    }

    const filename = (file.name || 'document').slice(0, 100);
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: 'Unsupported file format. Please upload a PDF (.pdf), Word document (.docx), or plain text (.txt).' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';

    if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
    } else if (ext === 'pdf') {
      try {
        extractedText = await extractTextFromPDF(buffer);
      } catch (pdfErr: any) {
        console.error('PDF extraction failed:', pdfErr);
        throw new Error('Could not parse PDF text streams. Please ensure the PDF contains selectable text and is not a scanned image.');
      }
    } else {
      extractedText = buffer.toString('utf-8');
    }

    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json(
        {
          error:
            'Unable to extract text from document. Please ensure the document is not an image-only scanned PDF without selectable text.',
        },
        { status: 422 }
      );
    }

    // Sanitize text length to prevent memory saturation
    const sanitizedText = extractedText.trim().slice(0, 100000);

    return NextResponse.json({
      success: true,
      filename,
      extractedText: sanitizedText,
      charCount: sanitizedText.length,
      wordCount: sanitizedText.split(/\s+/).filter(Boolean).length,
    });
  } catch (err: any) {
    console.error('Document parsing error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to parse uploaded document' },
      { status: 500 }
    );
  }
}
