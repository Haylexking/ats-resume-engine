import fs from 'fs';
import path from 'path';
import { MasterResume, JobApplicationRecord, AISettingConfig, OutcomeRecord } from '../engine/types';

// Use /tmp for writable storage in serverless environments (e.g. Vercel)
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
const DATA_DIR = isServerless ? path.join('/tmp', 'ats_data') : path.join(process.cwd(), 'data');
const MASTER_RESUME_FILE = path.join(DATA_DIR, 'master_resume.json');
const APPLICATIONS_FILE = path.join(DATA_DIR, 'applications.json');
const OUTCOMES_FILE = path.join(DATA_DIR, 'outcomes.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function ensureDirExists() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    // Ignore directory creation errors on read-only environments
  }
}

// 1. MASTER RESUME
export function getMasterResume(): MasterResume {
  ensureDirExists();
  if (!fs.existsSync(MASTER_RESUME_FILE)) {
    return getDefaultMasterResume();
  }
  try {
    const raw = fs.readFileSync(MASTER_RESUME_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return getDefaultMasterResume();
  }
}

export function saveMasterResume(resume: MasterResume): void {
  try {
    ensureDirExists();
    fs.writeFileSync(MASTER_RESUME_FILE, JSON.stringify(resume, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist master resume to disk (ephemeral serverless environment):', err);
  }
}

// 2. JOB APPLICATIONS & SCREENING OUTCOMES
export function getJobApplications(): JobApplicationRecord[] {
  ensureDirExists();
  if (!fs.existsSync(APPLICATIONS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(APPLICATIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

export function saveJobApplication(app: JobApplicationRecord): void {
  try {
    ensureDirExists();
    const existing = getJobApplications();
    const index = existing.findIndex((a) => a.id === app.id);
    if (index >= 0) {
      existing[index] = app;
    } else {
      existing.unshift(app);
    }
    fs.writeFileSync(APPLICATIONS_FILE, JSON.stringify(existing, null, 2), 'utf-8');
    syncOutcomeRecord(app);
  } catch (err) {
    console.warn('Could not persist application to disk (ephemeral serverless environment):', err);
  }
}

export function updateScreeningOutcome(
  id: string,
  outcome: 'passed_ats' | 'rejected_ats' | 'interview_scheduled' | 'no_response' | 'pending',
  appliedAt?: string,
  parseabilityDiff?: string[]
): void {
  const existing = getJobApplications();
  const target = existing.find((a) => a.id === id);
  if (target) {
    target.screening_outcome = outcome;
    if (appliedAt) target.applied_at = appliedAt;
    if (parseabilityDiff) target.parseability_diff = parseabilityDiff;
    saveJobApplication(target);
  }
}

// 3. OUTCOMES RECORD (Analytical Calibration)
export function getOutcomeRecords(): OutcomeRecord[] {
  ensureDirExists();
  if (!fs.existsSync(OUTCOMES_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(OUTCOMES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function syncOutcomeRecord(app: JobApplicationRecord): void {
  const outcomes = getOutcomeRecords();
  const index = outcomes.findIndex((o) => o.application_id === app.id);

  const missingReq = app.scores.missing_required_keywords || [];
  const missingPref = app.scores.missing_preferred_keywords || [];
  const allReq = app.parsed_jd.keywords_exact || [];
  const matchPercent = allReq.length > 0 ? Math.round(((allReq.length - missingReq.length) / allReq.length) * 100) : 100;

  const record: OutcomeRecord = {
    id: `out-${app.id}`,
    application_id: app.id,
    job_title: app.job_title,
    company: app.company,
    target_industry: app.industry,
    keyword_match_percent: matchPercent,
    semantic_score: app.scores.semantic_score,
    formatting_score: app.scores.formatting_score,
    screening_outcome: app.screening_outcome || 'pending',
    applied_at: app.applied_at || app.created_at,
    created_at: app.created_at,
    parseability_warnings_count: (app.parseability_diff || []).length,
    parseability_diff: app.parseability_diff || [],
    prompt_versions: app.prompt_versions,
  };

  if (index >= 0) {
    outcomes[index] = record;
  } else {
    outcomes.unshift(record);
  }
  fs.writeFileSync(OUTCOMES_FILE, JSON.stringify(outcomes, null, 2), 'utf-8');
}

// 4. AI SETTINGS
export function getAISettings(): AISettingConfig {
  ensureDirExists();
  const defaultNvidiaKey = process.env.NVIDIA_API_KEY || '';
  const defaultGroqKey = process.env.GROQ_API_KEY || '';
  const defaultGeminiKey = process.env.GEMINI_API_KEY || '';
  const defaultOpenAIKey = process.env.OPENAI_API_KEY || '';
  const defaultAnthropicKey = process.env.ANTHROPIC_API_KEY || '';

  const defaults: AISettingConfig = {
    provider: (process.env.DEFAULT_AI_PROVIDER as any) || 'groq',
    model: process.env.MODEL_PRIMARY || process.env.DEFAULT_AI_MODEL || 'groq/compound-mini',
    modelParse: process.env.MODEL_PARSE || 'qwen/qwen3.8-27b',
    modelReason: process.env.MODEL_REASON || 'groq/compound-mini',
    apiKeys: {
      nvidia: defaultNvidiaKey,
      groq: defaultGroqKey,
      gemini: defaultGeminiKey,
      openai: defaultOpenAIKey,
      anthropic: defaultAnthropicKey,
    },
  };

  if (!fs.existsSync(SETTINGS_FILE)) {
    saveAISettings(defaults);
    return defaults;
  }

  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const saved = JSON.parse(raw);
    return {
      provider: saved.provider || defaults.provider,
      model: saved.model || defaults.model,
      modelParse: saved.modelParse || defaults.modelParse,
      modelReason: saved.modelReason || defaults.modelReason,
      secondaryProvider: saved.secondaryProvider,
      secondaryModel: saved.secondaryModel,
      apiKeys: {
        nvidia: saved.apiKeys?.nvidia || defaultNvidiaKey,
        groq: saved.apiKeys?.groq || defaultGroqKey,
        gemini: saved.apiKeys?.gemini || defaultGeminiKey,
        openai: saved.apiKeys?.openai || defaultOpenAIKey,
        anthropic: saved.apiKeys?.anthropic || defaultAnthropicKey,
      },
    };
  } catch (err) {
    return defaults;
  }
}

export function saveAISettings(settings: AISettingConfig): void {
  ensureDirExists();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

function getDefaultMasterResume(): MasterResume {
  return {
    contact_block: {
      name: 'Alexander Akerele',
      email: 'alexakerele24@gmail.com',
      phone: '+234 906 066 5762',
      location: 'Lagos, Nigeria',
      linkedin: 'linkedin.com/in/alexander-akerele-663612141',
      github: 'linktr.ee/thebiochemist_ux',
    },
    summary:
      'Product Designer with 5+ years shipping end-to-end digital products across fintech, HealthTech, GovTech, Web3, and AI platforms. Proven track record of measurable outcomes: 35% order volume growth at Kukeat, 40% engagement lift, and a 20% improvement in government portal accessibility. Proficient in Figma, design systems, and cross-functional delivery.',
    skills_section: {
      languages: ['HTML5', 'CSS3', 'JavaScript basics'],
      frameworks: ['Tailwind CSS', 'React UI components'],
      tools_platforms: ['Figma', 'FigJam', 'Adobe XD', 'Sketch', 'Miro', 'Notion', 'Jira', 'Linear'],
      practices: [
        'UI/UX Design',
        'Product Design',
        'Design Systems',
        'Wireframing',
        'Interactive Prototyping',
        'User Research',
        'Usability Testing',
        'Information Architecture',
        'Journey Mapping',
        'User Flows',
        'WCAG Accessibility',
        'A/B Testing',
        'Design Strategy',
        'Cross-functional Delivery',
      ],
    },
    experience: [
      {
        id: 'exp-1',
        company: 'NexaPay',
        title: 'Lead Product Designer',
        dates: 'Jul 2024 – Present',
        location: 'Lagos, Nigeria (Remote)',
        bullets: [
          {
            id: 'b-101',
            text: 'Spearheaded end-to-end product design across NexaPay fintech ecosystem, including a live mobile app, merchant dashboard, and website redesign, improving transaction flow completion across 3 core user touchpoints.',
            skills: ['UI/UX Design', 'Fintech', 'Mobile App Design', 'Dashboard Design', 'User Flows'],
            metrics: ['3 core user touchpoints'],
            domains: ['Fintech'],
          },
          {
            id: 'b-102',
            text: 'Shipped the mobile app and merchant dashboard from wireframe through prototype validation, enforcing a Figma component library that reduced engineering rework and accelerated feature delivery.',
            skills: ['Figma', 'Wireframing', 'Prototyping', 'Design Systems', 'Component Library'],
            metrics: [],
            domains: ['Fintech'],
          },
          {
            id: 'b-103',
            text: 'Designed an intuitive KYC and onboarding flow in compliance with regional financial regulations, reducing customer drop-off during account verification.',
            skills: ['User Onboarding', 'KYC', 'Compliance-aware design', 'Usability Testing'],
            metrics: [],
            domains: ['Fintech'],
          },
        ],
      },
      {
        id: 'exp-2',
        company: 'Kukeat',
        title: 'Product Designer',
        dates: 'Nov 2023 – Jun 2024',
        location: 'Lagos, Nigeria',
        bullets: [
          {
            id: 'b-201',
            text: 'Transformed Kukeat from WhatsApp-only ordering to a full e-commerce platform, driving a 35% increase in order volume, 40% lift in user engagement, and a 20% improvement in customer loyalty.',
            skills: ['E-commerce', 'Product Strategy', 'UI/UX Design', 'E-commerce Marketplace'],
            metrics: ['35% order volume growth', '40% engagement lift', '20% customer loyalty'],
            domains: ['E-commerce'],
          },
          {
            id: 'b-202',
            text: 'Executed user research, MVP scoping, and checkout flow redesign alongside the Product Manager, delivering a prioritised backlog on schedule.',
            skills: ['User Research', 'MVP Scoping', 'Checkout Flows', 'Product Strategy'],
            metrics: [],
            domains: ['E-commerce'],
          },
        ],
      },
      {
        id: 'exp-3',
        company: 'Onamini',
        title: 'Lead Product Designer',
        dates: 'Dec 2023 – Apr 2024',
        location: 'Lagos, Nigeria (Remote)',
        bullets: [
          {
            id: 'b-301',
            text: 'Owned all product design across four user roles (Talents, Companies, Admins, Onboarding Managers), delivering journey maps, gig lifecycle and escrow state machines, and a complete developer-ready design system.',
            skills: ['Design Systems', 'State Machines', 'Marketplace Design', 'Journey Mapping', 'User Roles'],
            metrics: ['4 user roles'],
            domains: ['Web3', 'E-commerce'],
          },
        ],
      },
      {
        id: 'exp-4',
        company: 'Alma-Pario / Risigner Academy',
        title: 'Product Design Lead & Lead Instructor',
        dates: 'Sep 2022 – Oct 2023',
        location: 'Lagos, Nigeria',
        bullets: [
          {
            id: 'b-401',
            text: 'Mentored and trained 100+ aspiring designers in Figma, design systems, and design thinking, authoring a comprehensive 12-week UI/UX curriculum with practical portfolio deliverables.',
            skills: ['Figma', 'Design Systems', 'Mentorship', 'Curriculum Design', 'UI/UX Design'],
            metrics: ['100+ designers mentored', '12-week curriculum'],
            domains: ['EdTech'],
          },
        ],
      },
    ],
    education: [
      {
        institution: 'University of Ilorin',
        degree: 'Bachelor of Science (B.Sc.) in Biochemistry',
        dates: '2016 – 2021',
      },
    ],
    certifications: [
      'Certified ScrumMaster (CSM) — Scrum Alliance (In-progress)',
      'Enterprise Design Thinking Practitioner — IBM',
      'Google UX Design Professional Certificate — Coursera',
    ],
  };
}
