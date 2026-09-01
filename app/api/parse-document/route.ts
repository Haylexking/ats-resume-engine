import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { extractTextFromPDF } from '@/lib/engine/pdfExtractor';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const filename = file.name || 'document';
    const ext = filename.split('.').pop()?.toLowerCase();
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
        throw new Error('Could not parse PDF text streams: ' + (pdfErr?.message || 'Unknown error'));
      }
    } else if (ext === 'txt') {
      extractedText = buffer.toString('utf-8');
    } else {
      // Default to utf-8 text read
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

    return NextResponse.json({
      success: true,
      filename,
      extractedText: extractedText.trim(),
      charCount: extractedText.length,
      wordCount: extractedText.split(/\s+/).filter(Boolean).length,
    });
  } catch (err: any) {
    console.error('Document parsing error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to parse uploaded document' },
      { status: 500 }
    );
  }
}
