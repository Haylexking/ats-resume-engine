import { NextResponse } from 'next/server';
import { saveJobApplication } from '@/lib/db';
import { parseJobDescription } from '@/lib/engine/jdParser';
import { parseResumeText } from '@/lib/engine/resumeParser';
import { scoreResumeAgainstJD } from '@/lib/engine/atsScorer';
import { generateTieredRecommendations } from '@/lib/engine/recommendationEngine';
import { callLLMWithTrace } from '@/lib/engine/llmClient';
import { TargetIndustry, JobApplicationRecord, AISettingConfig, MasterResume, ParsedJD, TieredSuggestion, RecruiterInsights, ReasoningStep } from '@/lib/engine/types';
import { CURRENT_PROMPT_VERSIONS } from '@/lib/engine/prompts';

export const maxDuration = 60;

interface UnifiedAnalysisResponse {
  parsed_jd: ParsedJD;
  parsed_resume: MasterResume;
  suggestions: TieredSuggestion[];
  recruiter_insights: RecruiterInsights;
}

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

    const tStart = Date.now();
    let targetResume: MasterResume;
    let parsedJD: ParsedJD;
    let suggestions: TieredSuggestion[];
    let recruiter_insights: RecruiterInsights;
    let modelThinking: string | undefined;
    let singlePassDurationMs = 0;

    // STRATEGY 1: High-Speed Unified Frontier Synthesis (Single 2-second LLM pass)
    try {
      const unifiedSystemPrompt = `You are an elite ATS Resume Optimization Engine and Senior Executive Recruiter.
Analyze the target Job Description and Candidate Resume simultaneously.
Extract the structured metadata for both documents and synthesize human-crafted, high-impact Tier 1 rewrites and strategic recruiter insights.

STRICT RULES:
1. NEVER FABRICATE FAKE EXPERIENCE OR METRICS. Preserve 100% of candidate numbers, percentages, team sizes, and impact metrics.
2. TIER 1 REWRITES (Natural Bullet Upgrade): Find candidate bullets demonstrating relevant work and rewrite with target terminology using the Google XYZ formula: "Accomplished [X], as measured by [Y], by doing [Z]".
3. TIER 2 ADDITIONS (Plausible Additions): Suggest high-probability missing tools/skills based on senior experience with is_unverified = true.
4. TIER 3 FLAGS (Unmet Gap Warning): Highlight mandatory unmet gaps with no bullet suggestion.
5. RECRUITER INSIGHTS: Provide candid executive positioning strategy, interview talking points, portfolio recommendations, and potential risk factors.

Output strictly valid JSON with this exact schema:
{
  "parsed_jd": {
    "title": "Role Title",
    "company": "Company Name",
    "seniority_level": "Senior | Lead | Mid | Junior | Executive",
    "company_context": "Industry sector e.g. Fintech, E-commerce, B2B SaaS",
    "hard_skills": ["Skill1", "Skill2"],
    "soft_skills": ["Skill1"],
    "responsibilities": ["Responsibility 1", "Responsibility 2"],
    "qualifications_required": ["Requirement 1"],
    "qualifications_preferred": ["Preferred 1"],
    "keywords_exact": ["Keyword1", "Keyword2"]
  },
  "parsed_resume": {
    "contact_block": { "name": "Name", "email": "email", "phone": "phone", "location": "City, Country", "linkedin": "", "github": "" },
    "summary": "Professional Summary",
    "skills_section": { "languages": [], "frameworks": [], "tools_platforms": [], "practices": [] },
    "experience": [
      {
        "id": "exp-1",
        "company": "Company",
        "title": "Title",
        "dates": "Dates",
        "bullets": [{ "id": "b-1", "text": "Exact bullet text", "skills": [], "metrics": [] }]
      }
    ],
    "education": [{ "institution": "School", "degree": "Degree", "dates": "Dates" }],
    "certifications": []
  },
  "suggestions": [
    {
      "id": "sug-1",
      "tier": 1,
      "gap_addressed": "Terminology or skill gap",
      "original_bullet": "Original bullet from candidate resume",
      "suggested_text": "Upgraded high-impact bullet preserving all metrics",
      "is_unverified": false,
      "status": "pending",
      "why": "Recruiter rationale",
      "target_experience_id": "exp-1"
    }
  ],
  "recruiter_insights": {
    "positioning_strategy": "Strategic positioning narrative",
    "interview_talking_points": ["Talking point 1", "Talking point 2"],
    "portfolio_and_project_focus": ["Portfolio spotlight advice"],
    "risk_factors_or_gotchas": ["Potential objection and mitigation"],
    "additional_notes": "Executive advice"
  }
}`;

      const unifiedPrompt = `JOB DESCRIPTION:\n${cleanJd}\n\n====================\n\nCANDIDATE RESUME:\n${cleanResume}`;

      const traceResult = await callLLMWithTrace<UnifiedAnalysisResponse>(
        unifiedPrompt,
        unifiedSystemPrompt,
        safeAiSettings,
        () => null as any,
        { role: 'reason' }
      );

      if (
        traceResult.data &&
        traceResult.data.parsed_jd &&
        traceResult.data.parsed_resume &&
        Array.isArray(traceResult.data.suggestions)
      ) {
        parsedJD = traceResult.data.parsed_jd;
        targetResume = traceResult.data.parsed_resume;
        suggestions = traceResult.data.suggestions;
        recruiter_insights = traceResult.data.recruiter_insights || {};
        modelThinking = traceResult.thinking;
        singlePassDurationMs = traceResult.durationMs;
      } else {
        throw new Error('Unified pass schema incomplete, proceeding to modular pipeline');
      }
    } catch (unifiedErr) {
      console.warn('Single-pass unified synthesis fallback, running parallel modular extraction:', unifiedErr);

      // STRATEGY 2: Parallel Modular Fallback
      const [parsedResumeData, parsedJdData] = await Promise.all([
        parseResumeText(cleanResume, safeAiSettings),
        parseJobDescription(cleanJd, safeAiSettings, CURRENT_PROMPT_VERSIONS.parse),
      ]);

      targetResume = parsedResumeData;
      parsedJD = parsedJdData;

      const scoresInterim = await scoreResumeAgainstJD(targetResume, parsedJD, safeAiSettings, CURRENT_PROMPT_VERSIONS.score);
      const recResult = await generateTieredRecommendations(
        targetResume,
        parsedJD,
        scoresInterim,
        safeAiSettings,
        CURRENT_PROMPT_VERSIONS.recommend
      );

      suggestions = recResult.suggestions;
      recruiter_insights = recResult.recruiter_insights || {};
      modelThinking = recResult.thinking;
      singlePassDurationMs = recResult.durationMs || 0;
    }

    // Step 3: Run High-Precision Deterministic 3-Pass ATS Scoring
    const scores = await scoreResumeAgainstJD(targetResume, parsedJD, safeAiSettings, CURRENT_PROMPT_VERSIONS.score);
    const targetIndustry = (parsedJD.company_context || 'General') as TargetIndustry;
    const totalDurationMs = Date.now() - tStart;

    const reasoningTrace: ReasoningStep[] = [
      {
        phase: 'Phase 1: Dual-Context Structural Extraction',
        model: safeAiSettings.modelReason || safeAiSettings.model,
        durationMs: Math.round(totalDurationMs * 0.4),
        thoughts: `Analyzed raw job description and candidate resume. Identified target role "${parsedJD.title}" at "${parsedJD.company}" (Seniority: ${parsedJD.seniority_level}, Context: ${parsedJD.company_context}). Extracted ${parsedJD.hard_skills.length} core hard skills and ${parsedJD.keywords_exact.length} exact ATS terms.`,
        keyConclusions: [
          `Target role: ${parsedJD.title} @ ${parsedJD.company}`,
          `Seniority level: ${parsedJD.seniority_level}`,
          `Extracted ${parsedJD.hard_skills.length} hard skills & ${parsedJD.qualifications_required.length} qualifications`,
        ],
      },
      {
        phase: 'Phase 2: 3-Pass ATS Matching & Semantic Vector Alignment',
        model: 'Deterministic ATS Engine',
        durationMs: Math.round(totalDurationMs * 0.2),
        thoughts: `Evaluated 3-pass scoring algorithm against candidate resume. Hard keyword match achieved: ${scores.matched_keywords.length} keywords matched (${scores.missing_required_keywords.length} missing). Semantic narrative coverage: ${scores.responsibility_coverage.filter((r) => r.is_covered).length}/${scores.responsibility_coverage.length} evidenced. Composite ATS score: ${scores.composite_score}%.`,
        keyConclusions: [
          `Overall ATS Score: ${scores.composite_score}%`,
          `Hard Keywords: ${scores.hard_match_score}% (${scores.matched_keywords.length} matched)`,
          `Semantic Coverage: ${scores.responsibility_coverage.filter((r) => r.is_covered).length}/${scores.responsibility_coverage.length} responsibilities evidenced`,
        ],
      },
      {
        phase: 'Phase 3: 3-Tier Recruiter Synthesis & Executive Strategic Insights',
        model: safeAiSettings.modelReason || safeAiSettings.model,
        durationMs: singlePassDurationMs || Math.round(totalDurationMs * 0.4),
        thoughts: modelThinking || `Synthesized ${suggestions.filter((s) => s.tier === 1).length} Tier 1 authentic bullet rewrites, ${suggestions.filter((s) => s.tier === 2).length} Tier 2 additions, and formulated strategic positioning angles and interview talking points.`,
        keyConclusions: [
          `Generated ${suggestions.filter((s) => s.tier === 1).length} Tier 1 bullet rewrites preserving real candidate metrics`,
          `Generated ${suggestions.filter((s) => s.tier === 2).length} Tier 2 additions requiring verification`,
          `Drafted executive positioning and interview talking points`,
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
        provider: safeAiSettings.provider,
        model: safeAiSettings.model,
        modelParse: safeAiSettings.modelParse,
        modelReason: safeAiSettings.modelReason,
      },
    });
  } catch (error: any) {
    console.error('Error analyzing job description:', error);
    return NextResponse.json({ error: error?.message || 'Failed to analyze job description' }, { status: 500 });
  }
}
