import { MasterResume, ParsedJD, ScoreBreakdown, AISettingConfig } from './types';
import { callLLMJSON } from './llmClient';
import { getPromptTemplate } from './prompts';
import { isBlacklistedKeyword } from './jdParser';

// ═══════════════════════════════════════════════════════════════════════════════
// FIX #1 + #2: Comprehensive bidirectional synonym/abbreviation map (~120 entries)
// Real ATS systems (Workday, Greenhouse, Taleo) normalize these automatically.
// ═══════════════════════════════════════════════════════════════════════════════
const SYNONYM_MAP: Record<string, string[]> = {
  // UX/UI & Product Design
  'ui/ux designer': ['product designer', 'ui designer', 'ux designer', 'ui/ux design', 'interaction designer', 'lead product designer', 'senior product designer'],
  'product designer': ['ui/ux designer', 'ui/ux design', 'lead product designer', 'product design', 'ux/ui designer', 'senior product designer', 'ui designer'],
  'ui/ux design': ['ui/ux designer', 'product design', 'user interface design', 'user experience design', 'product designer', 'ux/ui design'],
  'ux': ['user experience', 'ux design', 'ux research', 'user experience design'],
  'user experience': ['ux', 'ux design', 'user experience design'],
  'ui': ['user interface', 'ui design', 'user interface design'],
  'user interface': ['ui', 'ui design', 'user interface design'],
  'figma': ['figma design', 'figma components', 'figma component library'],
  'design system': ['design systems', 'component library', 'figma component library', 'pattern library', 'ui library'],
  'design systems': ['design system', 'component library', 'figma component library', 'pattern library'],
  'user research': ['usability testing', 'user interviews', 'discovery research', 'ux research', 'user testing'],
  'wireframing': ['wireframes', 'wireframe', 'low-fidelity prototypes', 'mockups'],
  'prototyping': ['prototypes', 'prototype', 'interactive prototypes', 'figma prototypes'],
  'information architecture': ['journey maps', 'site maps', 'user flows', 'task flows', 'state machines'],
  'accessibility': ['wcag', 'a11y', 'accessible design', 'inclusive design', 'wcag-aligned'],
  'wcag': ['accessibility', 'a11y', 'wcag-aligned', 'accessible design'],
  'interaction design': ['interaction flows', 'interactive prototypes', 'ui animations'],

  // E-commerce & Marketplace
  'e-commerce marketplace': ['e-commerce platform', 'ecommerce platform', 'marketplace', 'e-commerce', 'ecommerce', 'gig marketplace', 'ordering platform'],
  'e-commerce': ['ecommerce', 'e-commerce platform', 'marketplace', 'retail tech', 'checkout', 'online ordering'],
  'ecommerce': ['e-commerce', 'e-commerce platform', 'marketplace', 'retail tech', 'checkout'],
  'marketplace': ['e-commerce marketplace', 'gig marketplace', 'multi-sided marketplace', 'e-commerce platform'],

  // Cloud & Infrastructure
  'aws': ['amazon web services', 'amazon aws'],
  'gcp': ['google cloud platform', 'google cloud'],
  'azure': ['microsoft azure', 'azure cloud'],
  'k8s': ['kubernetes'],
  'kubernetes': ['k8s', 'container orchestration'],
  'docker': ['containerization', 'containers', 'containerized'],
  'terraform': ['infrastructure as code', 'iac'],

  // Languages & Runtimes
  'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
  'typescript': ['ts'],
  'python': ['py'],
  'golang': ['go'],
  'go': ['golang'],
  'node.js': ['nodejs', 'node'],
  'nodejs': ['node.js', 'node'],
  'react': ['react.js', 'reactjs'],
  'react.js': ['react', 'reactjs'],
  'next.js': ['nextjs', 'next'],
  'nextjs': ['next.js', 'next'],
  'vue': ['vue.js', 'vuejs'],
  'angular': ['angularjs', 'angular.js'],
  'fastapi': ['fast api'],

  // Databases
  'postgresql': ['postgres', 'psql'],
  'postgres': ['postgresql', 'psql'],
  'mongodb': ['mongo'],
  'mysql': ['my sql'],
  'dynamodb': ['dynamo db'],
  'sql': ['structured query language'],
  'nosql': ['no-sql', 'non-relational database'],

  // DevOps & CI/CD
  'ci/cd': ['continuous integration', 'continuous deployment', 'continuous delivery', 'cicd'],
  'continuous integration': ['ci/cd', 'cicd'],
  'cicd': ['ci/cd', 'continuous integration'],

  // APIs
  'rest api': ['restful api', 'rest apis', 'restful apis', 'rest'],
  'restful api': ['rest api', 'rest apis', 'restful apis'],
  'graphql': ['graph ql'],
  'api': ['apis', 'application programming interface'],
  'grpc': ['g-rpc', 'google rpc'],

  // AI/ML
  'llm': ['large language model', 'large language models', 'llms'],
  'llms': ['large language model', 'large language models', 'llm'],
  'ml': ['machine learning'],
  'machine learning': ['ml'],
  'ai': ['artificial intelligence'],
  'artificial intelligence': ['ai'],
  'nlp': ['natural language processing'],
  'rag': ['retrieval augmented generation', 'retrieval-augmented generation'],
  'vector search': ['vector database', 'vector db', 'embedding search', 'pgvector', 'pinecone'],

  // Practices & Methodologies
  'tdd': ['test driven development', 'test-driven development'],
  'test driven development': ['tdd'],
  'agile': ['scrum', 'agile/scrum', 'agile methodology'],
  'scrum': ['agile', 'agile/scrum'],
  'microservices': ['micro-services', 'microservice architecture', 'service-oriented'],
  'system design': ['system architecture', 'systems design', 'systems architecture'],
  'system architecture': ['system design', 'systems architecture', 'systems design'],
  'a/b testing': ['ab testing', 'split testing', 'experimentation'],

  // Tools
  'kafka': ['apache kafka', 'event streaming'],
  'redis': ['in-memory cache', 'redis cache'],
  'elasticsearch': ['elastic search', 'elk stack'],
  'git': ['version control', 'github', 'gitlab', 'bitbucket'],
  'jest': ['unit testing', 'javascript testing'],
  'cypress': ['e2e testing', 'end-to-end testing'],

  // Compliance & Security
  'pci-dss': ['pci dss', 'pci compliance', 'payment card industry'],
  'hipaa': ['health insurance portability'],
  'fedramp': ['fed ramp', 'federal risk'],
  'soc2': ['soc 2', 'soc-2', 'service organization control'],
  'gdpr': ['general data protection regulation'],

  // Business concepts
  'saas': ['software as a service'],
  'b2b': ['business to business', 'business-to-business'],
  'b2c': ['business to consumer', 'business-to-consumer'],
  'kpi': ['key performance indicator', 'key performance indicators'],
  'okr': ['objectives and key results'],
  'roi': ['return on investment'],
  'etl': ['extract transform load', 'data pipeline', 'data pipelines'],

  // Web
  'html': ['html5'],
  'css': ['css3', 'cascading style sheets'],
  'tailwind': ['tailwind css', 'tailwindcss'],
  'tailwind css': ['tailwind', 'tailwindcss'],
  'webpack': ['bundler', 'module bundler'],
  'vite': ['build tool'],

  // Data & Analytics
  'data visualization': ['data viz', 'dashboards', 'reporting'],
  'analytics': ['data analytics', 'business analytics', 'product analytics'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// Simple Porter-like suffix stemmer for English tech vocabulary
// ═══════════════════════════════════════════════════════════════════════════════
function simpleStem(word: string): string {
  let w = word.toLowerCase().trim();
  // Remove common suffixes
  if (w.endsWith('ization')) w = w.slice(0, -7);
  else if (w.endsWith('izing')) w = w.slice(0, -5);
  else if (w.endsWith('ation')) w = w.slice(0, -5);
  else if (w.endsWith('ment')) w = w.slice(0, -4);
  else if (w.endsWith('ness')) w = w.slice(0, -4);
  else if (w.endsWith('able')) w = w.slice(0, -4);
  else if (w.endsWith('ible')) w = w.slice(0, -4);
  else if (w.endsWith('ting')) w = w.slice(0, -3);
  else if (w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.endsWith('ted')) w = w.slice(0, -2);
  else if (w.endsWith('ied')) w = w.slice(0, -3) + 'y';
  else if (w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.endsWith('es')) w = w.slice(0, -2);
  else if (w.endsWith('ly')) w = w.slice(0, -2);
  else if (w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  return w;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIX #18: Normalize and deduplicate keyword aliases
// "React" and "React.js" should count as one keyword, not penalize twice
// ═══════════════════════════════════════════════════════════════════════════════
function normalizeKeyword(kw: string): string {
  return kw.toLowerCase().replace(/[.\-\/]/g, '').replace(/\s+/g, ' ').trim();
}

function deduplicateKeywords(keywords: string[]): string[] {
  const seen = new Map<string, string>();
  for (const kw of keywords) {
    const norm = normalizeKeyword(kw);
    if (!seen.has(norm)) {
      seen.set(norm, kw); // Keep the original casing of the first occurrence
    }
  }
  return Array.from(seen.values());
}

// ═══════════════════════════════════════════════════════════════════════════════
// Enhanced keyword matching with synonyms + stemming
// ═══════════════════════════════════════════════════════════════════════════════
function keywordMatchesText(keyword: string, text: string): boolean {
  const kwLower = keyword.toLowerCase().trim();
  const textLower = text.toLowerCase();

  // 1. Direct substring match
  if (textLower.includes(kwLower)) return true;

  // 2. Stemmed match: stem every word in both and check
  const kwStemmed = simpleStem(kwLower);
  if (kwStemmed.length >= 3) {
    const textWords = textLower.split(/\s+/).map(simpleStem);
    if (textWords.includes(kwStemmed)) return true;
  }

  // 3. Synonym map lookup (bidirectional)
  const synonyms = SYNONYM_MAP[kwLower];
  if (synonyms) {
    for (const syn of synonyms) {
      if (textLower.includes(syn.toLowerCase())) return true;
    }
  }

  // 4. Reverse lookup: check if any synonym entry maps TO this keyword
  for (const [canonicalTerm, synList] of Object.entries(SYNONYM_MAP)) {
    if (synList.some((s) => s.toLowerCase() === kwLower)) {
      if (textLower.includes(canonicalTerm)) return true;
      // Also check other synonyms in the same group
      for (const s of synList) {
        if (s.toLowerCase() !== kwLower && textLower.includes(s.toLowerCase())) return true;
      }
    }
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIX #6: Extract implicit skills from bullet text
// Skills demonstrated in bullets but not listed in the skills section
// ═══════════════════════════════════════════════════════════════════════════════
function extractImplicitSkills(bulletTexts: string[], explicitSkills: string[]): string[] {
  const implicitSkillPatterns = [
    'React', 'Next.js', 'Node.js', 'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust',
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Kafka', 'Docker', 'Kubernetes',
    'AWS', 'GCP', 'Azure', 'GraphQL', 'REST', 'FastAPI', 'Django', 'Flask',
    'Tailwind', 'CSS', 'HTML', 'Webpack', 'Vite', 'Git', 'CI/CD', 'Jenkins',
    'Terraform', 'Ansible', 'Prometheus', 'Grafana', 'DataDog', 'Sentry',
    'PyTorch', 'TensorFlow', 'Spark', 'Airflow', 'dbt', 'Snowflake',
    'Figma', 'Storybook', 'Jest', 'Cypress', 'Playwright',
    'Ethers.js', 'Solidity', 'Web3', 'Pinecone', 'pgvector',
    'PCI-DSS', 'HIPAA', 'FedRAMP', 'SOC2', 'GDPR',
  ];

  const explicitLower = new Set(explicitSkills.map((s) => s.toLowerCase()));
  const found = new Set<string>();
  const allText = bulletTexts.join(' ');

  for (const skill of implicitSkillPatterns) {
    if (!explicitLower.has(skill.toLowerCase())) {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(allText)) {
        found.add(skill);
      }
    }
  }

  return Array.from(found);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIX #16: Parse years of experience from resume dates
// ═══════════════════════════════════════════════════════════════════════════════
function estimateTotalYearsOfExperience(resume: MasterResume): number {
  let totalMonths = 0;
  const currentYear = new Date().getFullYear();

  for (const exp of resume.experience) {
    const dateStr = exp.dates || '';
    // Parse patterns like "2021 – 2024", "2019 - Present", "Jan 2020 – Dec 2022"
    const parts = dateStr.split(/\s*[–\-—]\s*/);
    if (parts.length < 2) continue;

    const startYear = parseInt(parts[0].replace(/\D/g, '').slice(-4));
    const endPart = parts[1].toLowerCase().trim();
    const endYear = endPart.includes('present') || endPart.includes('current')
      ? currentYear
      : parseInt(endPart.replace(/\D/g, '').slice(-4));

    if (!isNaN(startYear) && !isNaN(endYear) && endYear >= startYear) {
      totalMonths += (endYear - startYear) * 12;
    }
  }

  return Math.round(totalMonths / 12);
}

function extractRequiredYears(jd: ParsedJD): number | null {
  const allText = [
    ...jd.qualifications_required,
    ...jd.responsibilities,
  ].join(' ');

  // Match patterns like "5+ years", "8+ years", "3-5 years", "minimum 6 years"
  const match = allText.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)?/i);
  if (match) return parseInt(match[1]);
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIX #4: TF-IDF-like cosine similarity for semantic matching fallback
// ═══════════════════════════════════════════════════════════════════════════════
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its',
  'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
  'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their', 'what', 'which',
  'who', 'whom', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'same',
  'so', 'than', 'too', 'very', 'just', 'because', 'about', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'between', 'under', 'also',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-\/\.]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .map(simpleStem);
}

function cosineSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const freqA = new Map<string, number>();
  const freqB = new Map<string, number>();

  for (const t of tokensA) freqA.set(t, (freqA.get(t) || 0) + 1);
  for (const t of tokensB) freqB.set(t, (freqB.get(t) || 0) + 1);

  const allTokens = new Set([...freqA.keys(), ...freqB.keys()]);
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const t of allTokens) {
    const a = freqA.get(t) || 0;
    const b = freqB.get(t) || 0;
    dotProduct += a * b;
    magA += a * a;
    magB += b * b;
  }

  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIX #4: LLM-backed semantic scoring for responsibility coverage
// ═══════════════════════════════════════════════════════════════════════════════
async function llmSemanticScore(
  responsibilities: string[],
  bullets: string[],
  config: AISettingConfig,
  promptVersion?: string
): Promise<Array<{ responsibility: string; is_covered: boolean; evidenced_by_bullet?: string; confidence: number }>> {
  const { content: systemPrompt } = getPromptTemplate('score', promptVersion);
  const prompt = `Job Responsibilities:\n${JSON.stringify(responsibilities)}\n\nResume Bullets:\n${JSON.stringify(bullets)}`;

  return callLLMJSON(
    prompt,
    systemPrompt,
    config,
    () => {
      // Fallback: use TF-IDF cosine similarity
      return responsibilities.map((resp) => {
        let bestBullet: string | undefined;
        let bestScore = 0;

        const respLower = resp.toLowerCase();
        const respTokens = respLower.split(/[\s,.-]+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w));

        for (const bullet of bullets) {
          const bLower = bullet.toLowerCase();
          let score = cosineSimilarity(resp, bullet);

          // Domain concept matching:
          // e.g. e-commerce/marketplace <-> ordering platform / e-commerce
          if (
            (respLower.includes('e-commerce') || respLower.includes('marketplace')) &&
            (bLower.includes('e-commerce') || bLower.includes('ordering') || bLower.includes('marketplace') || bLower.includes('checkout'))
          ) {
            score = Math.max(score, 0.75);
          }

          // UI/UX / Product Design / Flows / Prototypes
          if (
            (respLower.includes('intuitive') || respLower.includes('engaging') || respLower.includes('user flow') || respLower.includes('design')) &&
            (bLower.includes('product design') || bLower.includes('ui/ux') || bLower.includes('wireframe') || bLower.includes('prototype') || bLower.includes('usability'))
          ) {
            score = Math.max(score, 0.65);
          }

          // Check token overlap
          const matchedTokenCount = respTokens.filter((t) => bLower.includes(t)).length;
          if (respTokens.length > 0) {
            const tokenRatio = matchedTokenCount / respTokens.length;
            score = Math.max(score, tokenRatio * 0.8);
          }

          if (score > bestScore) {
            bestScore = score;
            bestBullet = bullet;
          }
        }

        const isCovered = bestScore >= 0.20;
        return {
          responsibility: resp,
          is_covered: isCovered,
          evidenced_by_bullet: isCovered ? bestBullet : undefined,
          confidence: Math.round(bestScore * 100),
        };
      });
    },
    { role: 'reason' }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIX #9: Expanded formatting / ATS parseability checks
// ═══════════════════════════════════════════════════════════════════════════════
function runFormattingChecks(resume: MasterResume): { score: number; hazards: string[] } {
  const hazards: string[] = [];
  let score = 100;

  // Check 1: Experience section exists
  if (!resume.experience || resume.experience.length === 0) {
    hazards.push('Missing "Experience" section — critical for ATS parsing.');
    score -= 35;
  }

  // Check 2: Education section exists
  if (!resume.education || resume.education.length === 0) {
    hazards.push('Missing "Education" section header.');
    score -= 15;
  }

  // Check 3: Skills section populated
  const totalSkills = [
    ...resume.skills_section.languages,
    ...resume.skills_section.frameworks,
    ...resume.skills_section.tools_platforms,
    ...resume.skills_section.practices,
  ].length;
  if (totalSkills === 0) {
    hazards.push('Skills section is empty — ATS keyword scanners primarily check this section.');
    score -= 20;
  }

  // Check 4: Summary/objective exists
  if (!resume.summary || resume.summary.trim().length < 20) {
    hazards.push('Missing or too-short Professional Summary. Most ATS parsers expect this section.');
    score -= 10;
  }

  // Check 5: Date consistency and presence
  const dateFormats: string[] = [];
  for (const exp of resume.experience) {
    if (!exp.dates || exp.dates.trim() === '') {
      hazards.push(`Missing dates for "${exp.title} at ${exp.company}" — ATS parsers flag this.`);
      score -= 10;
    } else {
      // Detect format: "2021 – 2024" vs "Jan 2021 – Dec 2024" vs "01/2021 – 12/2024"
      if (/\d{2}\/\d{4}/.test(exp.dates)) dateFormats.push('MM/YYYY');
      else if (/[A-Za-z]+\s+\d{4}/.test(exp.dates)) dateFormats.push('Mon YYYY');
      else if (/^\d{4}/.test(exp.dates)) dateFormats.push('YYYY');
    }
  }
  const uniqueFormats = new Set(dateFormats);
  if (uniqueFormats.size > 1) {
    hazards.push(`Inconsistent date formats detected (${Array.from(uniqueFormats).join(', ')}). ATS parsers may misparse mixed formats.`);
    score -= 5;
  }

  // Check 6: Contact info completeness
  if (!resume.contact_block.email) {
    hazards.push('Missing email in contact block — recruiters cannot reach you.');
    score -= 10;
  }
  if (!resume.contact_block.phone) {
    hazards.push('Missing phone number in contact block.');
    score -= 5;
  }

  // Check 7: Certifications present (bonus, not penalty)
  if (resume.certifications && resume.certifications.length > 0) {
    // No penalty, but noting presence
  }

  score = Math.max(0, Math.min(100, score));
  return { score, hazards };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIX #3: Extract meaningful phrases from preferred qualifications
// instead of splitting on whitespace which creates noise matches
// ═══════════════════════════════════════════════════════════════════════════════
function extractPreferredPhrases(preferredQuals: string[]): string[] {
  const phrases: string[] = [];
  for (const qual of preferredQuals) {
    // Extract tool/technology names and meaningful phrases
    // Match capitalized words, acronyms, compound terms
    const matches = qual.match(/\b[A-Z][a-zA-Z.\/\-]*(?:\s+[A-Z][a-zA-Z.\/\-]*)?\b/g);
    if (matches) {
      phrases.push(...matches.filter((m) => m.length > 2));
    }
    // Also extract phrases in quotes
    const quoted = qual.match(/"([^"]+)"/g);
    if (quoted) {
      phrases.push(...quoted.map((q) => q.replace(/"/g, '')));
    }
    // Fallback: if nothing extracted, use the full qualification as a phrase
    if (!matches && !quoted && qual.length > 10) {
      phrases.push(qual.trim());
    }
  }
  return [...new Set(phrases)];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCORING FUNCTION — complete rewrite with all fixes applied
// ═══════════════════════════════════════════════════════════════════════════════
export async function scoreResumeAgainstJD(
  resume: MasterResume,
  jd: ParsedJD,
  config: AISettingConfig,
  promptVersion?: string
): Promise<ScoreBreakdown> {
  // ─── Build full resume text corpus ───
  // FIX #7: Include certifications
  const allResumeBullets = resume.experience.flatMap((e) => e.bullets.map((b) => b.text));
  const resumeSkillsList = [
    ...resume.skills_section.languages,
    ...resume.skills_section.frameworks,
    ...resume.skills_section.tools_platforms,
    ...resume.skills_section.practices,
    ...resume.experience.flatMap((e) => e.bullets.flatMap((b) => b.skills)),
  ];

  // FIX #6: Extract implicit skills from bullet text
  const implicitSkills = extractImplicitSkills(allResumeBullets, resumeSkillsList);

  const fullResumeText = [
    resume.summary,
    resumeSkillsList.join(' '),
    implicitSkills.join(' '),
    resume.certifications.join(' '), // FIX #7
    allResumeBullets.join(' '),
    resume.experience.map((e) => `${e.title} ${e.company}`).join(' '),
  ].join(' ');

  // ═════════════════════════════════════════════════════════════════════════════
  // PASS A: KEYWORD / HARD-MATCH SCORE (50% weight)
  // FIX #5: Merge keywords_exact + hard_skills + skills from qualifications_required
  // FIX #18: Deduplicate normalized aliases
  // ═════════════════════════════════════════════════════════════════════════════
  const rawRequiredKeywords = [
    ...jd.keywords_exact,
    ...jd.hard_skills,
  ].filter((k) => !isBlacklistedKeyword(k));

  // Also extract skill-like tokens from qualifications_required
  const qualSkillPatterns = /\b(?:[A-Z][a-zA-Z.\/\-]+(?:\s+[A-Z][a-zA-Z.\/\-]+)?)\b/g;
  for (const qual of jd.qualifications_required) {
    const matches = qual.match(qualSkillPatterns);
    if (matches) {
      rawRequiredKeywords.push(
        ...matches.filter((m) => m.length > 2 && !isBlacklistedKeyword(m))
      );
    }
  }

  const requiredKeywords = deduplicateKeywords(rawRequiredKeywords).filter((k) => !isBlacklistedKeyword(k));

  const missingRequiredKeywords: string[] = [];
  const matchedKeywords: string[] = [];

  for (const kw of requiredKeywords) {
    // FIX #1: Use enhanced synonym+stem matching instead of includes()
    if (keywordMatchesText(kw, fullResumeText)) {
      matchedKeywords.push(kw);
    } else {
      missingRequiredKeywords.push(kw);
    }
  }

  const hardMatchScore = requiredKeywords.length > 0
    ? Math.round((matchedKeywords.length / requiredKeywords.length) * 100)
    : 0; // FIX: don't default to 85 when there's nothing to match

  // FIX #3: Preferred keyword matching at phrase level
  const preferredPhrases = extractPreferredPhrases(jd.qualifications_preferred);
  const missingPreferredKeywords: string[] = [];
  for (const phrase of preferredPhrases) {
    if (!keywordMatchesText(phrase, fullResumeText)) {
      missingPreferredKeywords.push(phrase);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PASS B: SEMANTIC / RELEVANCE SCORE (35% weight)
  // FIX #4: Use LLM-backed semantic scoring with TF-IDF cosine fallback
  // ═════════════════════════════════════════════════════════════════════════════
  let responsibilityCoverage: Array<{
    responsibility: string;
    is_covered: boolean;
    evidenced_by_bullet?: string;
    confidence?: number;
  }>;

  try {
    responsibilityCoverage = await llmSemanticScore(
      jd.responsibilities,
      allResumeBullets,
      config,
      promptVersion
    );
  } catch {
    // Final fallback: cosine similarity
    responsibilityCoverage = jd.responsibilities.map((resp) => {
      let bestBullet: string | undefined;
      let bestScore = 0;
      for (const bullet of allResumeBullets) {
        const score = cosineSimilarity(resp, bullet);
        if (score > bestScore) {
          bestScore = score;
          bestBullet = bullet;
        }
      }
      const isCovered = bestScore >= 0.12;
      return {
        responsibility: resp,
        is_covered: isCovered,
        evidenced_by_bullet: isCovered ? bestBullet : undefined,
        confidence: Math.round(bestScore * 100),
      };
    });
  }

  const coveredRespCount = responsibilityCoverage.filter((r) => r.is_covered).length;
  const semanticScore = responsibilityCoverage.length > 0
    ? Math.round((coveredRespCount / responsibilityCoverage.length) * 100)
    : 0;

  // ═════════════════════════════════════════════════════════════════════════════
  // PASS C: STRUCTURE / FORMATTING SCORE (15% weight)
  // FIX #9: Expanded formatting checks
  // ═════════════════════════════════════════════════════════════════════════════
  const { score: formattingScore, hazards: formattingHazards } = runFormattingChecks(resume);

  // ═════════════════════════════════════════════════════════════════════════════
  // FIX #16: Years of experience cross-check
  // ═════════════════════════════════════════════════════════════════════════════
  const candidateYears = estimateTotalYearsOfExperience(resume);
  const requiredYears = extractRequiredYears(jd);
  let yoeWarning: string | undefined;
  if (requiredYears !== null && candidateYears < requiredYears) {
    yoeWarning = `JD requires ${requiredYears}+ years of experience but resume shows ~${candidateYears} years. ATS auto-filters may reject on this.`;
    formattingHazards.push(yoeWarning);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // COMPOSITE ATS SCORE (50% Hard Match + 35% Semantic + 15% Formatting)
  // ═════════════════════════════════════════════════════════════════════════════
  const compositeScore = Math.round(
    hardMatchScore * 0.5 + semanticScore * 0.35 + formattingScore * 0.15
  );

  return {
    hard_match_score: hardMatchScore,
    semantic_score: semanticScore,
    formatting_score: formattingScore,
    composite_score: compositeScore,
    missing_required_keywords: missingRequiredKeywords,
    missing_preferred_keywords: missingPreferredKeywords,
    matched_keywords: matchedKeywords,
    responsibility_coverage: responsibilityCoverage,
    formatting_hazards: formattingHazards,
  };
}
