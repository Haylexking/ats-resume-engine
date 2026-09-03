import { NextResponse } from 'next/server';
import { saveJobApplication } from '@/lib/db';
import { parseJobDescription } from '@/lib/engine/jdParser';
import { parseResumeText } from '@/lib/engine/resumeParser';
import { scoreResumeAgainstJD } from '@/lib/engine/atsScorer';
import { generateTieredRecommendations } from '@/lib/engine/recommendationEngine';
import { TargetIndustry, JobApplicationRecord, AISettingConfig, MasterResume, ReasoningStep } from '@/lib/engine/types';
import { CURRENT_PROMPT_VERSIONS } from '@/lib/engine/prompts';

// Allow Vercel serverless execution up to 60s for deep reasoning models
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jdText, resumeText, customResumeText, aiSettings } = body as {
      jdText: string;
      resumeText?: string;
      customResumeText?: string;
      aiSettings: AISettingConfig;
    };

    const targetResumeText = resumeText || customResumeText;

    const cleanJd = (jdText || '').trim().slice(0, 50000);
    const cleanResume = (targetResumeText || '').trim().slice(0, 50000);

    if (!cleanJd) {
      return NextResponse.json({ error: 'Job description text is required' }, { status: 400 });
    }

    if (!cleanResume) {
      return NextResponse.json({ error: 'Candidate resume text or document is required' }, { status: 400 });
    }

    const safeAiSettings: AISettingConfig = {
      provider: aiSettings?.provider || 'groq',
      model: aiSettings?.model || 'groq/compound-mini',
      modelParse: aiSettings?.modelParse || 'qwen/qwen3.8-27b',
      modelReason: aiSettings?.modelReason || 'groq/compound-mini',
      secondaryProvider: aiSettings?.secondaryProvider,
      secondaryModel: aiSettings?.secondaryModel,
      apiKeys: aiSettings?.apiKeys || {},
    };

    // Step 1: Parse candidate resume into structured schema
    const targetResume: MasterResume = await parseResumeText(cleanResume, safeAiSettings);

    // Step 2: Parse JD into structured JSON (Role, Competencies, and Sector Context)
    const t0 = Date.now();
    const parsedJD = await parseJobDescription(cleanJd, safeAiSettings, CURRENT_PROMPT_VERSIONS.parse);
    const t1 = Date.now();

    const targetIndustry = (parsedJD.company_context || 'General') as TargetIndustry;

    // Step 3: Run 3-Pass ATS Matching and Scoring
    const scores = await scoreResumeAgainstJD(targetResume, parsedJD, safeAiSettings, CURRENT_PROMPT_VERSIONS.score);
    const t2 = Date.now();

    // Step 4: Generate Tiered Recommendations & Recruiter Insights
    const { suggestions, recruiter_insights, thinking, durationMs } = await generateTieredRecommendations(
      targetResume,
      parsedJD,
      scores,
      safeAiSettings,
      CURRENT_PROMPT_VERSIONS.recommend
    );
    const t3 = Date.now();

    const reasoningTrace: ReasoningStep[] = [
      {
        phase: 'Phase 1: Job Description Structural Extraction',
        model: safeAiSettings.modelParse || safeAiSettings.model,
        durationMs: t1 - t0,
        thoughts: `Analyzed raw job description text. Extracted target role "${parsedJD.title}" at "${parsedJD.company}" (Seniority: ${parsedJD.seniority_level}, Industry Context: ${parsedJD.company_context}). Identified ${parsedJD.hard_skills.length} core technical hard skills, ${parsedJD.keywords_exact.length} exact ATS terms, and ${parsedJD.qualifications_required.length} required qualifications.`,
        keyConclusions: [
          `Target role: ${parsedJD.title} @ ${parsedJD.company}`,
          `Seniority level: ${parsedJD.seniority_level}`,
          `Extracted ${parsedJD.hard_skills.length} hard skills & ${parsedJD.qualifications_required.length} qualifications`,
        ],
      },
      {
        phase: 'Phase 2: 3-Pass ATS Matching & Semantic Alignment',
        model: safeAiSettings.modelReason || safeAiSettings.model,
        durationMs: t2 - t1,
        thoughts: `Executed 3-pass scoring algorithm against candidate resume. Hard keyword match achieved: ${scores.matched_keywords.length} keywords matched (${scores.missing_required_keywords.length} missing required). Semantic narrative coverage: ${scores.responsibility_coverage.filter((r) => r.is_covered).length}/${scores.responsibility_coverage.length} responsibilities evidenced. Computed overall composite score: ${scores.composite_score}%.`,
        keyConclusions: [
          `Overall ATS Score: ${scores.composite_score}%`,
          `Hard Keywords: ${scores.hard_match_score}% (${scores.matched_keywords.length} matched)`,
          `Semantic Coverage: ${scores.responsibility_coverage.filter((r) => r.is_covered).length}/${scores.responsibility_coverage.length} responsibilities evidenced`,
        ],
      },
      {
        phase: 'Phase 3: 3-Tier Recruiter Synthesis & Executive Strategic Insights',
        model: safeAiSettings.modelReason || safeAiSettings.model,
        durationMs: durationMs || (t3 - t2),
        thoughts: thinking || `Synthesized ${suggestions.filter((s) => s.tier === 1).length} Tier 1 authentic bullet rewrites, ${suggestions.filter((s) => s.tier === 2).length} Tier 2 additions, and formulated strategic positioning angles, interview talking points, and portfolio spotlight advice.`,
        keyConclusions: [
          `Generated ${suggestions.filter((s) => s.tier === 1).length} Tier 1 bullet rewrites with real candidate metrics`,
          `Generated ${suggestions.filter((s) => s.tier === 2).length} Tier 2 additions requiring explicit verification`,
          `Drafted strategic positioning and hiring manager interview talking points`,
        ],
      },
    ];

    const appRecord: JobApplicationRecord = {
      id: 'app-' + Date.now(),
      created_at: new Date().toISOString(),
      job_title: parsedJD.title,
      company: parsedJD.company,
      industry: targetIndustry,
      jd_text: jdText,
      parsed_jd: parsedJD,
      scores,
      suggestions,
      recruiter_insights,
      reasoning_trace: reasoningTrace,
      screening_outcome: 'pending',
      prompt_versions: CURRENT_PROMPT_VERSIONS,
    };

    saveJobApplication(appRecord);

    return NextResponse.json({
      success: true,
      appRecord,
      lensedResume: targetResume,
      aiSettingsUsed: {
        provider: aiSettings.provider,
        model: aiSettings.model,
        modelParse: aiSettings.modelParse,
        modelReason: aiSettings.modelReason,
      },
    });
  } catch (error: any) {
    console.error('Error analyzing job description:', error);
    return NextResponse.json({ error: error?.message || 'Failed to analyze job description' }, { status: 500 });
  }
}
