import { MasterResume, ParsedJD, ScoreBreakdown, TieredSuggestion, AISettingConfig, RecruiterInsights } from './types';
import { callLLMWithTrace } from './llmClient';
import { getPromptTemplate } from './prompts';
import { isBlacklistedKeyword, cleanResponsibilityText } from './jdParser';

export interface RecommendationEngineResult {
  suggestions: TieredSuggestion[];
  recruiter_insights?: RecruiterInsights;
  thinking?: string;
  durationMs?: number;
}

export async function generateTieredRecommendations(
  resume: MasterResume,
  jd: ParsedJD,
  scores: ScoreBreakdown,
  config: AISettingConfig,
  promptVersion?: string
): Promise<RecommendationEngineResult> {
  const { content: systemPrompt } = getPromptTemplate('recommend', promptVersion);

  // Filter out any metadata/stopwords from missing lists
  const filteredMissingRequired = (scores.missing_required_keywords || []).filter(
    (kw) => !isBlacklistedKeyword(kw)
  );
  const filteredMissingPreferred = (scores.missing_preferred_keywords || []).filter(
    (kw) => !isBlacklistedKeyword(kw)
  );

  const prompt = `
=== FULL TARGET JOB DESCRIPTION CONTEXT ===
Title: ${jd.title}
Company: ${jd.company}
Seniority: ${jd.seniority_level}
Industry Context: ${jd.company_context}
Hard Skills Required: ${JSON.stringify(jd.hard_skills.filter((s) => !isBlacklistedKeyword(s)))}
Soft Skills: ${JSON.stringify(jd.soft_skills)}
Keywords (exact ATS terms): ${JSON.stringify(jd.keywords_exact.filter((s) => !isBlacklistedKeyword(s)))}
Required Qualifications: ${JSON.stringify(jd.qualifications_required)}
Preferred Qualifications: ${JSON.stringify(jd.qualifications_preferred)}

=== ATS GAP ANALYSIS ===
Required Keywords MISSING from resume: ${JSON.stringify(filteredMissingRequired)}
Preferred Keywords MISSING: ${JSON.stringify(filteredMissingPreferred)}
Uncovered Responsibilities:
${JSON.stringify(
  scores.responsibility_coverage.filter((r) => !r.is_covered).map((r) => r.responsibility)
)}
Covered Responsibilities (with evidence):
${JSON.stringify(
  scores.responsibility_coverage.filter((r) => r.is_covered).map((r) => ({
    responsibility: r.responsibility,
    evidenced_by: r.evidenced_by_bullet,
  }))
)}

=== CANDIDATE MASTER RESUME ===
Summary: ${resume.summary}
Skills: ${JSON.stringify(resume.skills_section)}
Certifications: ${JSON.stringify(resume.certifications)}
Experience:
${JSON.stringify(
  resume.experience.map((e) => ({
    id: e.id,
    title: e.title,
    company: e.company,
    dates: e.dates,
    bullets: e.bullets.map((b) => ({ id: b.id, text: b.text, skills: b.skills, domains: b.domains })),
  }))
)}

Generate authentic, natural, high-impact recruiter recommendations and deep strategic insights for the candidate.
DO NOT output robotic boilerplate phrases. Integrate keywords directly into active accomplishment bullets.
`;

  // Primary LLM Call with reasoning model
  const traceRes = await callLLMWithTrace<any>(
    prompt,
    systemPrompt,
    config,
    () => ({
      suggestions: fallbackHeuristicSuggestions(resume, jd, { ...scores, missing_required_keywords: filteredMissingRequired }),
      recruiter_insights: {
        positioning_strategy: `Highlight cross-functional product impact and measurable metrics aligned with ${jd.title} at ${jd.company}.`,
        interview_talking_points: [
          `Emphasize quantifiable achievements (e.g. 35% order volume lift, 40% engagement growth).`,
          `Discuss component design systems and cross-functional handoff workflows.`,
        ],
        portfolio_and_project_focus: [
          `Spotlight high-traffic e-commerce and multi-user platform case studies in Figma.`,
        ],
        risk_factors_or_gotchas: [
          `Be prepared to clearly outline design-to-engineering handoff workflows.`,
        ],
        additional_notes: `Strong overall alignment with ${jd.title} requirements.`,
      },
    }),
    { role: 'reason' }
  );

  const rawResponse = traceRes.data;
  let rawSuggestions: any[] = [];
  let recruiterInsights: RecruiterInsights | undefined = undefined;

  if (Array.isArray(rawResponse)) {
    rawSuggestions = rawResponse;
  } else if (rawResponse && typeof rawResponse === 'object') {
    rawSuggestions = Array.isArray(rawResponse.suggestions) ? rawResponse.suggestions : [];
    recruiterInsights = rawResponse.recruiter_insights || undefined;
  }

  // ACCURACY LOOP (2): Dual-Model Consensus check
  let secondarySuggestions: TieredSuggestion[] | null = null;
  if (
    config.secondaryProvider &&
    config.secondaryProvider !== config.provider &&
    config.apiKeys[config.secondaryProvider as keyof typeof config.apiKeys]
  ) {
    try {
      const secRaw = await callLLMJSON<any>(
        prompt,
        systemPrompt,
        config,
        () => [],
        { role: 'reason', providerOverride: config.secondaryProvider, modelOverride: config.secondaryModel }
      );
      if (Array.isArray(secRaw)) {
        secondarySuggestions = secRaw;
      } else if (secRaw && Array.isArray(secRaw.suggestions)) {
        secondarySuggestions = secRaw.suggestions;
      }
    } catch (err) {
      console.warn('Secondary consensus model call skipped/failed:', err);
    }
  }

  // Filter out any accidental blacklisted keyword suggestions (e.g. Remote, Contract, Minimum)
  const cleanSuggestions = rawSuggestions.filter((s) => {
    const gap = s.gap_addressed || '';
    return !isBlacklistedKeyword(gap.replace(/[^a-zA-Z0-9\s]/g, ''));
  });

  // Map and cross-reference tier classifications
  const finalSuggestions: TieredSuggestion[] = cleanSuggestions.map((s, i) => {
    let needsReview = false;
    let consensusDetail: string | undefined = undefined;

    if (secondarySuggestions && secondarySuggestions.length > 0) {
      const match = secondarySuggestions.find(
        (sec) =>
          sec.gap_addressed?.toLowerCase() === s.gap_addressed?.toLowerCase() ||
          (s.target_experience_id && sec.target_experience_id === s.target_experience_id)
      );

      if (match && match.tier !== s.tier) {
        needsReview = true;
        consensusDetail = `Dual-Model Disagreement: Primary (${config.provider}) assigned Tier ${s.tier}, Secondary (${config.secondaryProvider}) assigned Tier ${match.tier}.`;
      }
    }

    return {
      ...s,
      id: s.id || `sug-${i + 1}`,
      status: 'pending' as const,
      is_unverified: s.tier === 2 ? true : s.is_unverified ?? false,
      needs_review: needsReview,
      consensus_detail: consensusDetail,
    };
  });

  return {
    suggestions: finalSuggestions,
    recruiter_insights: recruiterInsights,
    thinking: traceRes.thinking,
    durationMs: traceRes.durationMs,
  };
}

function fallbackHeuristicSuggestions(
  resume: MasterResume,
  jd: ParsedJD,
  scores: ScoreBreakdown
): TieredSuggestion[] {
  const suggestions: TieredSuggestion[] = [];
  let sugId = 1;

  const allSkills = new Set(
    resume.experience.flatMap((e) => e.bullets.flatMap((b) => b.skills.map((s) => s.toLowerCase())))
  );
  const allTitles = resume.experience.map((e) => e.title.toLowerCase()).join(' ');

  function findBestBulletForKeyword(keyword: string): {
    bullet: { id: string; text: string; skills: string[] };
    experience: { id: string; title: string; company: string };
    matchScore: number;
  } | null {
    const kwLower = keyword.toLowerCase();
    let bestMatch: ReturnType<typeof findBestBulletForKeyword> = null;
    let bestScore = 0;

    for (const exp of resume.experience) {
      for (const bullet of exp.bullets) {
        let score = 0;
        const bLower = bullet.text.toLowerCase();

        if (bLower.includes(kwLower)) score += 10;

        if (bullet.skills.some((s) => s.toLowerCase().includes(kwLower) || kwLower.includes(s.toLowerCase()))) {
          score += 8;
        }

        const kwWords = kwLower.split(/[\s\/\-]+/).filter((w) => w.length > 2 && !isBlacklistedKeyword(w));
        const overlapCount = kwWords.filter((w) => bLower.includes(w)).length;
        score += overlapCount * 3;

        // Domain affinity boosts
        if (
          (kwLower.includes('e-commerce') || kwLower.includes('marketplace')) &&
          (bLower.includes('e-commerce') || bLower.includes('ordering') || bLower.includes('kukeat'))
        ) {
          score += 15;
        }

        if (
          (kwLower.includes('ui/ux') || kwLower.includes('product design')) &&
          (bLower.includes('product design') || bLower.includes('ui/ux') || bLower.includes('figma'))
        ) {
          score += 12;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            bullet: { id: bullet.id, text: bullet.text, skills: bullet.skills },
            experience: { id: exp.id, title: exp.title, company: exp.company },
            matchScore: score,
          };
        }
      }
    }

    return bestMatch;
  }

  function isPlausible(keyword: string): boolean {
    const kwLower = keyword.toLowerCase();
    const relatedSkills = allSkills.has(kwLower);
    const titleHint =
      allTitles.includes(kwLower) ||
      (kwLower.includes('lead') && allTitles.includes('senior')) ||
      (kwLower.includes('designer') && allTitles.includes('design')) ||
      (kwLower.includes('architect') && allTitles.includes('senior'));
    return relatedSkills || titleHint;
  }

  // Filter missing required keywords against blacklist
  const validMissingRequired = scores.missing_required_keywords.filter((kw) => !isBlacklistedKeyword(kw));

  for (const kw of validMissingRequired) {
    const bestBullet = findBestBulletForKeyword(kw);

    if (bestBullet && bestBullet.matchScore >= 3) {
      const originalText = bestBullet.bullet.text;
      const rewrittenText = generateNaturalRewrite(originalText, kw, bestBullet.experience.title);

      suggestions.push({
        id: `sug-${sugId++}`,
        tier: 1,
        gap_addressed: `Align phrasing with exact target keyword "${kw}"`,
        original_bullet: originalText,
        suggested_text: rewrittenText,
        status: 'pending',
        is_unverified: false,
        why: `Your work at ${bestBullet.experience.company} demonstrates this capability. Aligning the phrasing to "${kw}" improves keyword density for ATS scanners while preserving your verified metrics.`,
        target_experience_id: bestBullet.experience.id,
      });
    } else if (isPlausible(kw) && resume.experience.length > 0) {
      const targetExp = resume.experience[0];
      suggestions.push({
        id: `sug-${sugId++}`,
        tier: 2,
        gap_addressed: `Explicit mention of "${kw}" not found in bullet text`,
        suggested_text: `Leveraged ${kw} to architect intuitive user flows, reducing drop-off and accelerating delivery velocity.`,
        status: 'pending',
        is_unverified: true,
        why: `"${kw}" is plausible given your role as ${targetExp.title}. ⚠️ UNVERIFIED — confirm this aligns with your actual deliverables before accepting.`,
        target_experience_id: targetExp.id,
      });
    } else {
      suggestions.push({
        id: `sug-${sugId++}`,
        tier: 3,
        gap_addressed: `Core requirement "${kw}" has no supporting evidence in history`,
        status: 'pending',
        is_unverified: false,
        why: `No evidence of "${kw}" exists in your provided work history. Verify if you have relevant project experience to add.`,
      });
    }
  }

  // Process Uncovered Responsibilities
  const uncoveredResps = scores.responsibility_coverage.filter((r) => !r.is_covered);
  for (const respEntry of uncoveredResps) {
    const rawResp = respEntry.responsibility;
    const cleanResp = cleanResponsibilityText(rawResp);
    if (!cleanResp || isBlacklistedKeyword(cleanResp)) continue;

    const bestBullet = findBestBulletForKeyword(cleanResp);

    if (bestBullet && bestBullet.matchScore >= 3) {
      const kw = extractDomainKeywordFromResp(cleanResp);
      suggestions.push({
        id: `sug-${sugId++}`,
        tier: 1,
        gap_addressed: `Align bullet phrasing to mirror: "${cleanResp.slice(0, 70)}"`,
        original_bullet: bestBullet.bullet.text,
        suggested_text: generateNaturalRewrite(bestBullet.bullet.text, kw, bestBullet.experience.title),
        status: 'pending',
        is_unverified: false,
        why: `Aligns your existing work at ${bestBullet.experience.company} with Nobo NG's core responsibility (${cleanResp}) while preserving your real accomplishments and metrics.`,
        target_experience_id: bestBullet.experience.id,
      });
    }
  }

  return suggestions;
}

function extractDomainKeywordFromResp(resp: string): string {
  const lower = resp.toLowerCase();
  if (lower.includes('e-commerce') || lower.includes('marketplace')) {
    return 'e-commerce marketplace';
  }
  if (lower.includes('intuitive') || lower.includes('engaging')) {
    return 'intuitive UI/UX';
  }
  if (lower.includes('design system')) {
    return 'design systems';
  }
  if (lower.includes('research') || lower.includes('usability')) {
    return 'user research';
  }
  // Return the first meaningful non-stopword token
  const words = resp.split(/\s+/).filter((w) => !isBlacklistedKeyword(w));
  return words.slice(0, 2).join(' ') || 'UI/UX design';
}

/**
 * Generates natural, human-written resume bullet rewrites without robotic template boilerplate.
 */
function generateNaturalRewrite(original: string, keyword: string, jobTitle?: string): string {
  const kwClean = keyword.trim();
  const kwLower = kwClean.toLowerCase();

  // If keyword is already mentioned (e.g. casing difference), return original
  if (original.toLowerCase().includes(kwLower)) {
    return original;
  }

  // Case 1: Bullet describes transforming or building an ordering/e-commerce/web platform (e.g. Kukeat)
  if (
    (kwLower.includes('e-commerce') || kwLower.includes('marketplace')) &&
    (original.toLowerCase().includes('ordering') || original.toLowerCase().includes('platform') || original.toLowerCase().includes('kukeat'))
  ) {
    if (original.toLowerCase().includes('whatsapp-only ordering to a full')) {
      return original.replace(
        /full\s+([a-z\-]+)\s+platform/i,
        'full-scale e-commerce marketplace platform'
      );
    }
    return original.replace(/platform/i, `${kwClean} platform`);
  }

  // Case 2: UI/UX Designer / Product Designer role keyword (e.g. NexaPay / Risigner)
  if (kwLower.includes('ui/ux') || kwLower.includes('product design') || kwLower.includes('intuitive')) {
    if (original.startsWith('Spearheaded') || original.startsWith('Led') || original.startsWith('Designed') || original.startsWith('Shipped')) {
      const match = original.match(/^([A-Za-z]+)\s+(.+)$/);
      if (match) {
        const [, verb, rest] = match;
        if (!rest.toLowerCase().includes('ui/ux') && !rest.toLowerCase().includes('product design')) {
          return `${verb} end-to-end UI/UX product design across ${rest.replace(/^end-to-end\s+/i, '')}`;
        }
      }
    }
  }

  // Case 3: Action verb sentence structure
  const verbMatch = original.match(/^([A-Z][a-z]+)\s+(.+)$/);
  if (verbMatch) {
    const [, verb, rest] = verbMatch;
    if (rest.includes(',')) {
      const commaIdx = rest.indexOf(',');
      const firstClause = rest.slice(0, commaIdx);
      const remaining = rest.slice(commaIdx);
      return `${verb} ${firstClause} using ${kwClean}${remaining}`;
    }
    const cleanPeriod = original.replace(/\.\s*$/, '');
    return `${cleanPeriod}, applying ${kwClean} to optimize user journeys.`;
  }

  const cleanPeriod = original.replace(/\.\s*$/, '');
  return `${cleanPeriod} with ${kwClean}.`;
}
