import { NextResponse } from 'next/server';
import { generateTailoredResume } from '@/lib/engine/tailorEngine';
import { generateTailoredDocx } from '@/lib/engine/docxExporter';
import { AISettingConfig, ResumeTemplateId } from '@/lib/engine/types';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      jdText,
      resumeText,
      customResumeText,
      aiSettings,
      templateId = 'classic-harvard',
    } = body as {
      jdText: string;
      resumeText?: string;
      customResumeText?: string;
      aiSettings?: AISettingConfig;
      templateId?: ResumeTemplateId;
    };

    const targetResumeText = (resumeText || customResumeText || '').trim();
    const targetJdText = (jdText || '').trim();

    if (!targetJdText) {
      return NextResponse.json(
        { error: 'Target Job Description text is required for resume tailoring.' },
        { status: 400 }
      );
    }

    if (!targetResumeText) {
      return NextResponse.json(
        { error: 'Candidate Resume text or document is required for resume tailoring.' },
        { status: 400 }
      );
    }

    // 1. Generate full Tailored Resume via multi-stage pipeline
    const tailoredResume = await generateTailoredResume({
      jdText: targetJdText,
      resumeText: targetResumeText,
      aiSettings,
      templateId,
    });

    // 2. Generate styled .docx buffer according to the selected template preset
    const docxBuffer = await generateTailoredDocx(tailoredResume, templateId);
    const docxBase64 = docxBuffer.toString('base64');

    // 3. Construct professional ATS filename
    const candidateName =
      tailoredResume.contact_block?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Resume';
    const roleName =
      tailoredResume.target_role?.replace(/[^a-zA-Z0-9]/g, '_') || 'Tailored';
    const filename = `${candidateName}_${roleName}_${templateId}.docx`;

    return NextResponse.json({
      success: true,
      tailoredResume,
      docxBase64,
      filename,
    });
  } catch (error: any) {
    console.error('Error in /api/tailor:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to generate tailored resume.',
      },
      { status: 500 }
    );
  }
}
