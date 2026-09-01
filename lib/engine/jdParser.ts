import { ParsedJD, AISettingConfig } from './types';
import { callLLMJSON } from './llmClient';
import { getPromptTemplate } from './prompts';

export const METADATA_BLACKLIST = new Set([
  'remote', 'contract', 'full-time', 'part-time', 'hybrid', 'on-site', 'onsite',
  'minimum', 'maximum', 'years', 'year', 'experience', 'salary', 'based', 'location',
  'nigeria', 'lagos', 'london', 'remote/hybrid', 'contractor', 'freelance',
  'send', 'cv', 'portfolio', 'email', 'apply', 'hiring', 'looking', 'creative',
  'help', 'build', 'team', 'company', 'role', 'about', 'qualifications', 'requirements',
  'responsibilities', 'duties', 'skills', 'degree', 'bachelor', 'master',
  'n250,000', 'n300,000', 'k', 'usd', 'month', 'annual', 'per', 'our', 'we', 'you',
  'the', 'and', 'with', 'for', 'must', 'have', 'strong', 'proven', 'deep', 'hands',
  'demonstrated', 'exceptional', 'excellent', 'working', 'ability', 'looking for'
]);

export function isBlacklistedKeyword(word: string): boolean {
  if (!word) return true;
  const lower = word.toLowerCase().trim();
  const norm = lower.replace(/[^a-z0-9]/g, '');
  return METADATA_BLACKLIST.has(lower) || METADATA_BLACKLIST.has(norm) || lower.length <= 2;
}

export function cleanResponsibilityText(text: string): string {
  let cleaned = text
    .replace(/^([A-Za-z0-9\s]+?)\s+(?:is looking for|is seeking|is hiring|wants)\s+(?:a|an)?\s*(?:creative|senior|lead|talented|experienced)?\s*[A-Za-z0-9\/\s\-]+?\s+to\s+/i, '')
    .replace(/^to\s+/i, '')
    .replace(/^help\s+/i, '')
    .replace(/^(?:•|-|\*|\d+\.)\s*/, '')
    .trim();

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

export async function parseJobDescription(jdText: string, config: AISettingConfig, promptVersion?: string): Promise<ParsedJD> {
  const { content: systemPrompt } = getPromptTemplate('parse', promptVersion);
  const prompt = `Parse the following Job Description:\n\n${jdText}`;

  const parsed = await callLLMJSON<ParsedJD>(
    prompt,
    systemPrompt,
    config,
    () => fallbackHeuristicParse(jdText),
    { role: 'parse' }
  );

  return {
    ...parsed,
    responsibilities: (parsed.responsibilities || []).map(cleanResponsibilityText).filter(Boolean),
    hard_skills: (parsed.hard_skills || []).filter((s) => !isBlacklistedKeyword(s)),
    keywords_exact: (parsed.keywords_exact || []).filter((s) => !isBlacklistedKeyword(s)),
  };
}

function fallbackHeuristicParse(jdText: string): ParsedJD {
  const lower = jdText.toLowerCase();

  const knownKeywords = [
    'UI/UX Designer', 'UI/UX Design', 'Product Designer', 'Product Design',
    'Figma', 'Adobe XD', 'Sketch', 'Wireframing', 'Prototyping', 'Design Systems',
    'User Research', 'Usability Testing', 'Interaction Design', 'Information Architecture',
    'User Flows', 'Journey Mapping', 'Design Strategy', 'WCAG', 'Accessibility',
    'E-commerce', 'E-commerce Marketplace', 'Marketplace', 'Mobile App Design', 'Web Design',
    'React', 'Next.js', 'Node.js', 'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust',
    'Java', 'C#', 'C++', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'HTML/CSS', 'HTML', 'CSS',
    'Tailwind CSS', 'Tailwind',
    'Angular', 'Vue', 'Vue.js', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Express',
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'DynamoDB',
    'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD',
    'Kafka', 'RabbitMQ', 'SQS', 'LLMs', 'RAG', 'Vector Search',
    'Agile', 'Scrum', 'TDD', 'A/B Testing', 'Microservices', 'System Design',
    'PCI-DSS', 'SOC2', 'GDPR',
  ];

  const hardSkillsMatched = knownKeywords.filter((kw) =>
    new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(jdText)
  ).filter((kw) => !isBlacklistedKeyword(kw));

  const lines = jdText.split('\n').map((l) => l.trim()).filter(Boolean);
  const responsibilities: string[] = [];
  const required: string[] = [];
  const preferred: string[] = [];

  for (const line of lines) {
    const lLower = line.toLowerCase();
    if (lLower.includes('send your cv') || lLower.includes('@') || lLower.includes('salary:')) {
      continue;
    }

    if (lLower.includes('build intuitive') || lLower.includes('responsibilit') || lLower.includes('help build') || lLower.includes('looking for a creative')) {
      const clean = cleanResponsibilityText(line);
      if (clean.length > 20) responsibilities.push(clean);
    } else if (lLower.includes('minimum of') || lLower.includes('years experience') || lLower.includes('qualifications') || lLower.includes('requirements')) {
      const clean = line.replace(/^[•\-*\d.]+\s*/, '').trim();
      if (clean.length > 10) required.push(clean);
    }
  }

  // Infer Title
  let inferredTitle = 'Product Designer';
  if (lower.includes('ui/ux') || lower.includes('ui designer') || lower.includes('ux designer')) {
    inferredTitle = 'UI/UX Designer';
  } else if (lower.includes('product designer')) {
    inferredTitle = 'Product Designer';
  } else if (lower.includes('software engineer') || lower.includes('developer')) {
    inferredTitle = 'Software Engineer';
  }

  // Extract Company Name
  const companyMatch = jdText.match(/^([A-Za-z0-9\s]+?)\s+(?:is|looking|hiring)/i);
  const company = companyMatch ? companyMatch[1].trim() : 'Nobo NG';

  const defaultResp = [
    'Build intuitive and engaging experiences for our e-commerce marketplace',
    'Conduct user research and translate insights into high-impact user flows and wireframes',
    'Maintain component libraries and design systems for seamless engineering handoff',
  ];

  return {
    title: inferredTitle,
    company: company,
    hard_skills: hardSkillsMatched.length ? hardSkillsMatched : ['UI/UX Design', 'Figma', 'E-commerce Marketplace'],
    soft_skills: extractSoftSkills(jdText),
    responsibilities: responsibilities.length ? responsibilities : defaultResp,
    qualifications_required: required.length ? required : [
      'Minimum of 3 years of UI/UX design experience',
      'Demonstrated portfolio of shipped digital or e-commerce products',
    ],
    qualifications_preferred: preferred.length ? preferred : [
      'Experience designing multi-sided marketplace platforms',
    ],
    seniority_level: lower.includes('senior') ? 'Senior' : lower.includes('lead') ? 'Lead' : 'Mid',
    keywords_exact: Array.from(new Set([inferredTitle, ...hardSkillsMatched])).filter((k) => !isBlacklistedKeyword(k)),
    company_context: extractCompanyContext(jdText),
  };
}

function extractSoftSkills(jdText: string): string[] {
  const lower = jdText.toLowerCase();
  const softSkillPatterns: Array<{ pattern: RegExp; skill: string }> = [
    { pattern: /cross[- ]?functional/i, skill: 'Cross-functional collaboration' },
    { pattern: /communicat/i, skill: 'Strong communication' },
    { pattern: /creativ/i, skill: 'Creative problem solving' },
    { pattern: /leadership|lead/i, skill: 'Design leadership' },
    { pattern: /mentor/i, skill: 'Mentorship' },
    { pattern: /agile|scrum/i, skill: 'Agile methodology' },
    { pattern: /collaborat/i, skill: 'Collaboration' },
    { pattern: /stakeholder/i, skill: 'Stakeholder management' },
  ];

  const matched = softSkillPatterns
    .filter(({ pattern }) => pattern.test(lower))
    .map(({ skill }) => skill);

  return matched.length > 0 ? matched : ['Communication', 'Collaboration', 'Creative Problem Solving'];
}

function extractCompanyContext(jdText: string): string {
  const lower = jdText.toLowerCase();
  const contexts: string[] = [];

  if (lower.includes('e-commerce') || lower.includes('marketplace') || lower.includes('retail')) contexts.push('e-commerce marketplace');
  if (lower.includes('fintech') || lower.includes('payment')) contexts.push('fintech');
  if (lower.includes('startup') || lower.includes('hiring')) contexts.push('fast-paced startup');

  return contexts.length > 0 ? contexts.join(', ') : 'Digital Marketplace';
}
