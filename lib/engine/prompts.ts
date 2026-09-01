import fs from 'fs';
import path from 'path';

const PROMPTS_DIR = path.join(process.cwd(), 'prompts');

export const CURRENT_PROMPT_VERSIONS = {
  parse: 'jd-parse-v1',
  score: 'semantic-scoring-v1',
  recommend: 'tiered-recommendations-v1',
};

export function getPromptTemplate(versionKey: keyof typeof CURRENT_PROMPT_VERSIONS, customVersion?: string): { version: string; content: string } {
  const version = customVersion || CURRENT_PROMPT_VERSIONS[versionKey];
  const filePath = path.join(PROMPTS_DIR, `${version}.md`);

  try {
    if (fs.existsSync(filePath)) {
      return {
        version,
        content: fs.readFileSync(filePath, 'utf-8').trim(),
      };
    }
  } catch (err) {
    console.warn(`Failed to read prompt file ${filePath}, using fallback constant`);
  }

  // Fallback defaults if file system is constrained
  if (versionKey === 'parse') {
    return {
      version: 'jd-parse-v1',
      content: `You are an expert ATS parser and technical executive recruiter. Extract structured JSON data from a Job Description text. Output ONLY valid JSON with keys: title, company, hard_skills, soft_skills, responsibilities, qualifications_required, qualifications_preferred, seniority_level, keywords_exact, company_context.`,
    };
  }

  if (versionKey === 'score') {
    return {
      version: 'semantic-scoring-v1',
      content: `You are an expert recruiter evaluating resume fit. For each job responsibility, determine if ANY of the provided resume bullets provide evidence that the candidate can perform that responsibility. Output JSON array with keys: responsibility, is_covered, evidenced_by_bullet, confidence.`,
    };
  }

  return {
    version: 'tiered-recommendations-v1',
    content: `You are a career strategist and ATS resume optimization expert. Generate tiered recommendations for aligning a resume with a Job Description following strict 3-tier rules: Tier 1 (Rewrite), Tier 2 (Add bullet, is_unverified=true), Tier 3 (Flag only). Output JSON array.`,
  };
}
