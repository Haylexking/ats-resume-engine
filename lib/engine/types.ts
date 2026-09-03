export interface MasterBullet {
  id: string;
  text: string;
  skills: string[];
  metrics: string[];
  domains: string[]; // e.g. ['Fintech', 'AI Platforms', 'E-commerce']
}

export interface MasterExperience {
  id: string;
  company: string;
  title: string;
  dates: string;
  location?: string;
  bullets: MasterBullet[];
}

export interface MasterResume {
  contact_block: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
  };
  summary: string;
  skills_section: {
    languages: string[];
    frameworks: string[];
    tools_platforms: string[];
    practices: string[];
  };
  experience: MasterExperience[];
  education: Array<{
    institution: string;
    degree: string;
    dates: string;
  }>;
  certifications: string[];
}

export type TargetIndustry = 
  | 'Fintech' 
  | 'EdTech' 
  | 'GovTech' 
  | 'HealthTech' 
  | 'Web3' 
  | 'AI Platforms' 
  | 'E-commerce' 
  | 'TravelTech';

export interface IndustryLens {
  id: TargetIndustry;
  name: string;
  description: string;
  priority_skills: string[];
  vocabulary_register: Record<string, string>; // e.g. "payment gateway" -> "compliance-aware payment pipeline"
}

export interface ParsedJD {
  title: string;
  company: string;
  hard_skills: string[];
  soft_skills: string[];
  responsibilities: string[];
  qualifications_required: string[];
  qualifications_preferred: string[];
  seniority_level: string;
  keywords_exact: string[];
  company_context: string;
}

export interface ScoreBreakdown {
  hard_match_score: number; // 0 - 100
  semantic_score: number; // 0 - 100
  formatting_score: number; // 0 - 100
  composite_score: number; // 50% hard + 35% semantic + 15% formatting
  missing_required_keywords: string[];
  missing_preferred_keywords: string[];
  matched_keywords: string[];
  responsibility_coverage: Array<{
    responsibility: string;
    is_covered: boolean;
    evidenced_by_bullet?: string;
  }>;
  formatting_hazards: string[];
}

export interface TieredSuggestion {
  id: string;
  tier: 1 | 2 | 3;
  gap_addressed: string;
  original_bullet?: string;
  suggested_text?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'confirmed';
  is_unverified: boolean; // true for Tier 2 ("UNVERIFIED — confirm this is true")
  why: string;
  target_experience_id?: string;
  needs_review?: boolean; // true if dual-model consensus disagreed on classification
  consensus_detail?: string; // details on secondary model tier classification
}

export interface ParseabilityResult {
  passed: boolean;
  raw_extracted_text: string;
  diff_warnings: string[];
  garbled_sections: string[];
}

export type AIProvider = 'nvidia' | 'groq' | 'gemini' | 'openai' | 'anthropic' | 'mock';

export interface AISettingConfig {
  provider: AIProvider;
  model: string;
  modelParse?: string; // e.g. meta/llama-3.2-11b-vision-instruct, qwen/qwen3.8-27b, or gemini-3.6-flash
  modelReason?: string; // e.g. meta/llama-3.2-90b-vision-instruct or groq/compound
  secondaryProvider?: AIProvider;
  secondaryModel?: string;
  apiKeys?: {
    nvidia?: string;
    groq?: string;
    gemini?: string;
    openai?: string;
    anthropic?: string;
  };
}

export interface RecruiterInsights {
  positioning_strategy?: string;
  interview_talking_points?: string[];
  portfolio_and_project_focus?: string[];
  risk_factors_or_gotchas?: string[];
  additional_notes?: string;
}

export interface ReasoningStep {
  phase: string;
  model: string;
  durationMs: number;
  thoughts: string;
  keyConclusions?: string[];
}

export type ScreeningOutcome =
  | 'passed_ats'
  | 'rejected_ats'
  | 'interview_scheduled'
  | 'no_response'
  | 'pending'
  | 'callback'
  | 'interview'
  | 'rejection'
  | 'offer';

export interface JobApplicationRecord {
  id: string;
  created_at: string;
  job_title: string;
  company: string;
  industry: TargetIndustry;
  jd_text: string;
  parsed_jd: ParsedJD;
  scores: ScoreBreakdown;
  suggestions: TieredSuggestion[];
  recruiter_insights?: RecruiterInsights;
  reasoning_trace?: ReasoningStep[];
  screening_outcome?: ScreeningOutcome;
  applied_at?: string;
  parseability_diff?: string[];
  prompt_versions?: {
    parse: string;
    score: string;
    recommend: string;
  };
}

export interface OutcomeRecord {
  id: string;
  application_id: string;
  job_title: string;
  company: string;
  target_industry: TargetIndustry;
  keyword_match_percent: number;
  semantic_score: number;
  formatting_score: number;
  screening_outcome: ScreeningOutcome;
  applied_at: string;
  created_at: string;
  parseability_warnings_count: number;
  parseability_diff: string[];
  prompt_versions?: {
    parse: string;
    score: string;
    recommend: string;
  };
}
