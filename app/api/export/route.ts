import { NextResponse } from 'next/server';
import { getMasterResume, updateScreeningOutcome, getJobApplications } from '@/lib/db';
import { applyIndustryLens } from '@/lib/engine/industryLens';
import { generateATSCompliantDocx } from '@/lib/engine/docxExporter';
import { runParseabilityHarness } from '@/lib/engine/parseabilityHarness';
import { TargetIndustry, TieredSuggestion, MasterResume } from '@/lib/engine/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { appId, industry = 'AI Platforms', acceptedSuggestions = [], format = 'docx', resume: customResume } = body;

    let targetResume: MasterResume;
    if (customResume && customResume.contact_block) {
      targetResume = customResume;
    } else {
      const masterResume = getMasterResume();
      targetResume = applyIndustryLens(masterResume, industry as TargetIndustry);
    }

    // Generate DOCX buffer with accepted Tier 1 rewrites and Tier 2 additions
    const docxBuffer = await generateATSCompliantDocx(targetResume, acceptedSuggestions as TieredSuggestion[]);

    // Step 5: Run Parseability Harness to verify what ATS parsers actually extract
    const parseabilityResult = await runParseabilityHarness(docxBuffer, targetResume);

    // If application ID provided, record parseability diff in outcomes table
    if (appId) {
      const apps = getJobApplications();
      const targetApp = apps.find((a) => a.id === appId);
      const currentOutcome = targetApp?.screening_outcome || 'pending';
      const allDiffs = [...parseabilityResult.diff_warnings, ...parseabilityResult.garbled_sections];
      updateScreeningOutcome(appId, currentOutcome, undefined, allDiffs);
    }

    if (format === 'txt') {
      return NextResponse.json({
        success: true,
        text: parseabilityResult.raw_extracted_text,
        parseability: parseabilityResult,
      });
    }

    const base64 = docxBuffer.toString('base64');
    const safeName = targetResume.contact_block?.name?.replace(/\s+/g, '_') || 'Candidate';
    return NextResponse.json({
      success: true,
      filename: `Resume_${safeName}_${industry}.docx`,
      base64,
      parseability: parseabilityResult,
    });
  } catch (err: any) {
    console.error('Error generating export:', err);
    return NextResponse.json({ error: err.message || 'Failed to export resume' }, { status: 500 });
  }
}
