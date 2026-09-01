'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Sparkles,
  Layers,
  FileText,
  Upload,
  Clipboard,
  Database,
  CheckCircle2,
  FileUp,
  X,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { TargetIndustry, MasterResume, AISettingConfig } from '@/lib/engine/types';
import { INDUSTRY_LENSES } from '@/lib/engine/industryLens';

export interface AnalyzePayload {
  jdText: string;
  industry: TargetIndustry;
  resumeMode: 'master' | 'custom';
  customResumeText?: string;
}

interface JDInputPanelProps {
  onAnalyze: (payload: AnalyzePayload) => void;
  isLoading: boolean;
  masterResume: MasterResume;
  aiSettings?: AISettingConfig;
  onOpenSettings?: () => void;
}

const SAMPLE_JDS: Record<string, { title: string; industry: TargetIndustry; text: string }> = {
  ai_platforms: {
    title: 'Senior AI Systems Engineer @ AI Platform',
    industry: 'AI Platforms',
    text: `Job Title: Senior AI Systems Engineer
Company: Apex AI Technologies
Location: San Francisco, CA (Hybrid / Remote)

About the Role:
We are seeking a Senior AI Systems Engineer to build high-throughput LLM gateway infrastructure, vector indexing pipelines, and agentic tool execution services.

Key Responsibilities:
- Architect multi-tenant LLM proxy servers handling 1M+ daily API requests with low latency.
- Build vector indexing pipelines using PostgreSQL pgvector / Pinecone for high-precision RAG context retrieval.
- Design agentic tool execution endpoints with JSON Schema validation and retry fallbacks.
- Optimize infrastructure costs and monitor model inference latency.

Qualifications Required:
- 5+ years of software engineering experience with strong proficiency in TypeScript, Node.js, and Python.
- Proven experience with LLMs, RAG architectures, Vector Search, and FastAPI.
- Hands-on expertise with PostgreSQL, Redis, Docker, and AWS / GCP.
- Deep understanding of System Design and API security controls.

Preferred Qualifications:
- Experience with PyTorch, model fine-tuning, or streaming evaluation benchmarks.
- Previous exposure to high-concurrency microservices and Kafka.`,
  },
  fintech: {
    title: 'Staff Full-Stack Engineer @ Fintech Payments',
    industry: 'Fintech',
    text: `Job Title: Staff Full-Stack Engineer — Payments & Settlements
Company: Vanguard Payments
Location: New York, NY

About the Role:
Looking for a Staff Engineer to lead PCI-DSS compliant payment microservices and real-time checkout engines handling millions in annual transaction volumes.

Key Responsibilities:
- Build low-latency payment processing APIs integrating Stripe, Adyen, and ACH rails.
- Ensure strict PCI-DSS Level 1 compliance, data tokenization, and audit logging.
- Scale PostgreSQL transaction ledger systems handling 5,000+ TPS.
- Partner with product to design intuitive merchant onboarding and KYC dashboards.

Qualifications Required:
- 6+ years of full-stack engineering experience using TypeScript, React, Node.js, and PostgreSQL.
- Demonstrated experience with PCI-DSS standards, Payment Gateways, and Kafka.
- Strong grounding in TDD, CI/CD, and Microservices architecture.

Preferred Qualifications:
- Experience with fraud prevention algorithms or financial reporting engines.`,
  },
  ecommerce: {
    title: 'Lead Full-Stack Developer @ Retail Tech',
    industry: 'E-commerce',
    text: `Job Title: Lead Full-Stack Developer — Checkout Experience
Company: OmniMart Digital
Location: Remote

About the Role:
We need a Lead Developer to drive conversion velocity across our high-traffic checkout funnels and mobile web apps.

Key Responsibilities:
- Optimize React and Next.js page load velocity and Core Web Vitals.
- Implement A/B testing frameworks for checkout optimization.
- Integrate catalog search and inventory microservices.

Qualifications Required:
- 5+ years of experience with React, Next.js, TypeScript, and Web Performance.
- Proficiency with A/B Testing methodologies and Microservices.
- Experience with SQL and Redis caching layers.`,
  },
};

export const JDInputPanel: React.FC<JDInputPanelProps> = ({
  onAnalyze,
  isLoading,
  masterResume,
  aiSettings,
  onOpenSettings,
}) => {
  // Job Description state
  const [jdText, setJdText] = useState(SAMPLE_JDS.ai_platforms.text);
  const [industry, setIndustry] = useState<TargetIndustry>('AI Platforms');

  // Resume state
  const [resumeMode, setResumeMode] = useState<'master' | 'custom'>('master');
  const [resumeSubMode, setResumeSubMode] = useState<'paste' | 'upload'>('paste');
  const [customResumeText, setCustomResumeText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Live timer for analysis feedback
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleLoadSample = (key: string) => {
    const sample = SAMPLE_JDS[key];
    if (sample) {
      setJdText(sample.text);
      setIndustry(sample.industry);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData,
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const textResp = await res.text();
        throw new Error(`Server returned error (${res.status}): ${textResp.slice(0, 100)}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract text from document');
      }

      setCustomResumeText(data.extractedText);
      setUploadedFileName(file.name);
      setResumeMode('custom');
      setResumeSubMode('paste'); // Automatically reveal the extracted text
    } catch (err: any) {
      setUploadError(err.message || 'Error parsing document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdText.trim()) return;

    onAnalyze({
      jdText,
      industry,
      resumeMode,
      customResumeText: resumeMode === 'custom' ? customResumeText : undefined,
    });
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-6 shadow-2xl backdrop-blur-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Two-Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PANEL 1: TARGET JOB DESCRIPTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-zinc-300" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                  Target Job Description
                </h2>
              </div>

              {/* Sample Presets */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-zinc-500">Presets:</span>
                {(['ai_platforms', 'fintech', 'ecommerce'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleLoadSample(k)}
                    className="rounded-md border border-white/[0.06] bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-zinc-300 transition-all hover:bg-zinc-800 hover:text-zinc-100 active:scale-[0.98]"
                  >
                    {k === 'ai_platforms' ? 'AI' : k === 'fintech' ? 'Fintech' : 'E-com'}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={16}
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste job description requirements, qualifications, and responsibilities here..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#09090b] p-4 font-mono text-xs leading-relaxed text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-all resize-none shadow-inner"
              />
              <div className="absolute bottom-3 right-3 text-[10px] font-mono text-zinc-500 bg-zinc-900/80 px-2 py-0.5 rounded border border-white/[0.06]">
                {jdText.length} chars • {jdText.split(/\s+/).filter(Boolean).length} words
              </div>
            </div>
          </div>

          {/* PANEL 2: CANDIDATE RESUME SOURCE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-zinc-300" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                  Candidate Resume Source
                </h2>
              </div>

              {/* Segmented Mode Switcher */}
              <div className="flex items-center rounded-lg bg-zinc-900 p-0.5 border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setResumeMode('master')}
                  className={`flex items-center space-x-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                    resumeMode === 'master'
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Layers className="h-3 w-3" />
                  <span>Master Data</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResumeMode('custom')}
                  className={`flex items-center space-x-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                    resumeMode === 'custom'
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Clipboard className="h-3 w-3" />
                  <span>Paste / Upload</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT: MASTER DATA LAYER */}
            {resumeMode === 'master' ? (
              <div className="rounded-xl border border-white/[0.08] bg-[#09090b] p-4 space-y-4 min-h-[380px] flex flex-col justify-between shadow-inner">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-400">
                      Select Target Industry Lens:
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      Single ground truth • Zero hallucinated bullets
                    </span>
                  </div>

                  {/* Industry Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(INDUSTRY_LENSES).map((indKey) => {
                      const ind = indKey as TargetIndustry;
                      const isSelected = industry === ind;
                      return (
                        <button
                          key={ind}
                          type="button"
                          onClick={() => setIndustry(ind)}
                          className={`rounded-lg p-2.5 text-left border transition-all duration-150 active:scale-[0.98] ${
                            isSelected
                              ? 'border-zinc-500 bg-zinc-800/80 text-zinc-100 ring-1 ring-zinc-500/50'
                              : 'border-white/[0.06] bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          <div className="text-xs font-semibold text-zinc-100 flex items-center justify-between">
                            <span>{ind}</span>
                            {isSelected && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                            {INDUSTRY_LENSES[ind].priority_skills.slice(0, 3).join(', ')}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Master Resume Quick Stats Footer */}
                <div className="rounded-lg border border-white/[0.06] bg-zinc-900/60 p-3 text-xs space-y-1 text-zinc-300">
                  <div className="flex items-center justify-between font-medium text-zinc-200 text-[11px]">
                    <span>Candidate: {masterResume.contact_block.name}</span>
                    <span className="text-zinc-400 font-mono">
                      {masterResume.experience.length} Roles •{' '}
                      {masterResume.experience.reduce((acc, e) => acc + e.bullets.length, 0)} Bullets
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Applying <strong>{industry}</strong> lens reweights skills and tunes vocabulary to this industry&apos;s register while preserving ground truth.
                  </p>
                </div>
              </div>
            ) : (
              /* TAB CONTENT: CUSTOM RESUME (PASTE OR UPLOAD) */
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-zinc-900/60 p-1 rounded-lg border border-white/[0.06]">
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => setResumeSubMode('paste')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                        resumeSubMode === 'paste'
                          ? 'bg-zinc-800 text-zinc-100'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Paste Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setResumeSubMode('upload')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition ${
                        resumeSubMode === 'upload'
                          ? 'bg-zinc-800 text-zinc-100'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Upload className="h-3 w-3" />
                      <span>Upload DOCX / PDF / TXT</span>
                    </button>
                  </div>

                  {uploadedFileName && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 truncate max-w-[160px]">
                      {uploadedFileName}
                    </span>
                  )}
                </div>

                {resumeSubMode === 'upload' ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-700/80 hover:border-zinc-500 bg-[#09090b] rounded-xl p-8 text-center cursor-pointer transition-all min-h-[320px] flex flex-col items-center justify-center space-y-3 group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      accept=".docx,.pdf,.txt"
                      className="hidden"
                    />

                    <div className="h-12 w-12 rounded-xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-300 group-hover:text-zinc-100 group-hover:scale-105 transition-all shadow-sm">
                      {isUploading ? (
                        <Sparkles className="h-6 w-6 animate-spin text-zinc-400" />
                      ) : (
                        <FileUp className="h-6 w-6" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-zinc-200">
                        {isUploading ? 'Extracting text...' : 'Click or Drag Resume File to Upload'}
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Supports Word (.docx), PDF (.pdf), and Plain Text (.txt)
                      </p>
                    </div>

                    {uploadError && (
                      <div className="text-[11px] text-rose-400 flex items-center gap-1 bg-rose-500/10 px-3 py-1 rounded border border-rose-500/20">
                        <AlertCircle className="h-3 w-3" />
                        <span>{uploadError}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <textarea
                      rows={14}
                      value={customResumeText}
                      onChange={(e) => setCustomResumeText(e.target.value)}
                      placeholder="Paste your existing resume text here (experience bullets, skills, education)..."
                      className="w-full rounded-xl border border-white/[0.08] bg-[#09090b] p-4 font-mono text-xs leading-relaxed text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-all resize-none shadow-inner"
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] font-mono text-zinc-500 bg-zinc-900/80 px-2 py-0.5 rounded border border-white/[0.06]">
                      {customResumeText.length} chars • {customResumeText.split(/\s+/).filter(Boolean).length} words
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Loading Progress Bar & Latency Feedback */}
        {isLoading && (
          <div className="rounded-xl border border-white/[0.08] bg-zinc-900/90 p-4 space-y-3 animate-fade-in shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="h-4 w-4 text-emerald-400 animate-spin" />
                <div>
                  <span className="text-xs font-semibold text-zinc-200">
                    {elapsedSeconds < 5
                      ? 'Step 1/3: Extracting JD Structure & Core Competencies...'
                      : elapsedSeconds < 14
                      ? `Step 2/3: Applying ${industry} Lens & Computing ATS Overlap...`
                      : 'Step 3/3: Synthesizing 3-Tier Recruiter Rewrites & Gap Analysis...'}
                  </span>
                  <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2 mt-0.5">
                    <span>Model: {aiSettings?.modelReason || aiSettings?.model || 'Active AI Model'}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">{elapsedSeconds}s elapsed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress bar line */}
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.min(95, Math.max(15, elapsedSeconds * 6))}%`,
                }}
              />
            </div>

            {/* Live Model Thinking Feed */}
            <div className="flex items-center space-x-2 rounded-lg bg-zinc-950/80 px-3 py-2 border border-blue-500/20 text-[11px] font-mono text-blue-300">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping flex-shrink-0" />
              <span className="truncate">
                {elapsedSeconds < 4 && '🧠 Parsing JD syntax, seniority benchmarks, and core technical requirements...'}
                {elapsedSeconds >= 4 && elapsedSeconds < 9 && '🔍 Cross-referencing technical skills (Figma, Design Systems, E-commerce) with candidate experience...'}
                {elapsedSeconds >= 9 && elapsedSeconds < 16 && '⚖️ Evaluating 3-pass keyword frequency, semantic duty coverage, and penalty weights...'}
                {elapsedSeconds >= 16 && elapsedSeconds < 25 && '✍️ Synthesizing authentic Tier 1 bullet rewrites preserving candidate metrics (35% order lift)...'}
                {elapsedSeconds >= 25 && '🎯 Formulating executive positioning strategy, interview talking points, and portfolio guidance...'}
              </span>
            </div>

            {/* Helper notice if elapsed > 15s */}
            {elapsedSeconds >= 15 && (
              <div className="flex items-center justify-between text-[11px] text-zinc-400 bg-[#09090b] p-2.5 rounded-lg border border-white/[0.06]">
                <span>
                  Large reasoning models (e.g. Kimi K3 / Llama 90B) execute deep multi-stage evaluations.
                </span>
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 underline ml-2 whitespace-nowrap"
                  >
                    Switch to Fast Model (Groq / 11B)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-white/[0.06] gap-4">
          <div className="text-xs text-zinc-400">
            {resumeMode === 'master' ? (
              <span>Matching against Master Data with <strong>{industry}</strong> lens</span>
            ) : (
              <span>Matching against custom {uploadedFileName ? `file (${uploadedFileName})` : 'pasted resume text'}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !jdText.trim() || (resumeMode === 'custom' && !customResumeText.trim())}
            className="flex items-center space-x-2 rounded-xl bg-zinc-100 px-6 py-2.5 text-xs font-semibold text-zinc-900 shadow-md transition-all hover:bg-white hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin text-zinc-900" />
                <span>Running Analysis ({elapsedSeconds}s)...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current text-zinc-900" />
                <span>Run ATS Match & Gap Engine</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
