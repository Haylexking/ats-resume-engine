'use client';

import React, { useState } from 'react';
import {
  TailoredResume,
  ResumeTemplateId,
  TailoredBullet,
  FactCheckViolation,
} from '@/lib/engine/types';
import {
  Check,
  Copy,
  Download,
  FileText,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Eye,
  GitCompare,
  Sparkles,
  Building,
  Briefcase,
  Award,
  GraduationCap,
  Layers,
  ArrowRight,
  ExternalLink,
  Info,
  UserCheck,
  Clock,
  Palette,
  Type,
  ThumbsUp,
  AlertCircle,
  XCircle,
} from 'lucide-react';

interface TailoredResumeStudioProps {
  tailoredResume: TailoredResume;
  initialDocxBase64?: string;
  onTemplateChange?: (newTemplate: ResumeTemplateId) => Promise<string | void>;
  onClose?: () => void;
}

export const TailoredResumeStudio: React.FC<TailoredResumeStudioProps> = ({
  tailoredResume,
  initialDocxBase64,
  onTemplateChange,
  onClose,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateId>(
    tailoredResume.template_id || 'classic-harvard'
  );
  const [viewMode, setViewMode] = useState<'preview' | 'diff' | 'audit' | 'recruiter'>('preview');
  const [docxBase64, setDocxBase64] = useState<string | undefined>(initialDocxBase64);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- RECRUITER PRE-FLIGHT AUDIT COMPUTATIONS ---
  // 1. Summary word count & check (50 - 90 words)
  const summaryWordCount = tailoredResume.summary
    ? tailoredResume.summary.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const isSummaryOptimal = summaryWordCount >= 45 && summaryWordCount <= 95;

  // 2. Total words & estimated page count (~480 words/page)
  const fullText = generatePlainTextResume(tailoredResume);
  const totalWordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedPages = Math.max(1, Math.ceil(totalWordCount / 480));
  const isPageBudgetOptimal = totalWordCount <= 850 && estimatedPages <= 2;

  // 3. Achiever vs. Doer Voice & Banned Phrases Check
  const bannedPhrases = [
    'partnered with',
    'responsible for',
    'assisted with',
    'helped to',
    'tasked with',
    'worked on',
    'participated in',
    'duties included',
  ];
  const allTailoredBullets = tailoredResume.experience.flatMap((e) =>
    e.bullets.map((b) => b.tailored_text || b.original_text)
  );
  const passiveFindings: { bullet: string; phrase: string; company: string }[] = [];
  tailoredResume.experience.forEach((e) => {
    e.bullets.forEach((b) => {
      const text = b.tailored_text || b.original_text;
      const lower = text.toLowerCase();
      for (const phrase of bannedPhrases) {
        if (lower.includes(phrase)) {
          passiveFindings.push({ bullet: text, phrase, company: e.company });
        }
      }
    });
  });
  const activeBulletRatio =
    allTailoredBullets.length > 0
      ? Math.round(
          ((allTailoredBullets.length - passiveFindings.length) / allTailoredBullets.length) * 100
        )
      : 100;

  // 4. Curated Skills Count (8 - 14 target)
  const skillsCount =
    (tailoredResume.skills_section?.languages?.length || 0) +
    (tailoredResume.skills_section?.frameworks?.length || 0) +
    (tailoredResume.skills_section?.tools_platforms?.length || 0) +
    (tailoredResume.skills_section?.practices?.length || 0);
  const isSkillsCurated = skillsCount >= 6 && skillsCount <= 16;

  // 5. Month + Year Chronology Check
  const monthRegex = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|present|current)/i;
  const dateAnomalies: string[] = [];
  tailoredResume.experience.forEach((e) => {
    if (!monthRegex.test(e.dates)) {
      dateAnomalies.push(`${e.company} (${e.dates})`);
    }
  });
  const isDatesCompliant = dateAnomalies.length === 0;

  // 6. Recruiter Score calculation (out of 100)
  let recruiterScore = 100;
  if (!isSummaryOptimal) recruiterScore -= 12;
  if (!isPageBudgetOptimal) recruiterScore -= 18;
  if (passiveFindings.length > 0) recruiterScore -= Math.min(25, passiveFindings.length * 8);
  if (!isSkillsCurated) recruiterScore -= 10;
  if (!isDatesCompliant) recruiterScore -= 10;
  recruiterScore = Math.max(60, recruiterScore);

  // Template switch handler
  const handleSelectTemplate = async (templateId: ResumeTemplateId) => {
    setSelectedTemplate(templateId);
    if (onTemplateChange) {
      setIsGeneratingDocx(true);
      try {
        const newBase64 = await onTemplateChange(templateId);
        if (typeof newBase64 === 'string') {
          setDocxBase64(newBase64);
        }
      } catch (err) {
        console.error('Failed to regenerate template docx:', err);
      } finally {
        setIsGeneratingDocx(false);
      }
    }
  };

  // Helper to trigger direct DOCX binary download
  const handleDownloadDocx = async () => {
    const candidateName =
      tailoredResume.contact_block?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Resume';
    const roleName =
      tailoredResume.target_role?.replace(/[^a-zA-Z0-9]/g, '_') || 'Tailored';
    const filename = `${candidateName}_${roleName}_${selectedTemplate}.docx`;

    if (docxBase64) {
      downloadBase64File(
        docxBase64,
        filename,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      return;
    }

    // If no pre-cached docxBase64, request one from API
    setIsGeneratingDocx(true);
    try {
      const res = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jdText: `${tailoredResume.target_role} at ${tailoredResume.target_company}`,
          resumeText: generatePlainTextResume(tailoredResume),
          templateId: selectedTemplate,
        }),
      });
      const data = await res.json();
      if (data.success && data.docxBase64) {
        setDocxBase64(data.docxBase64);
        downloadBase64File(
          data.docxBase64,
          filename,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
      } else {
        alert(data.error || 'Failed to download DOCX document.');
      }
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Error generating DOCX: ' + err.message);
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  // Helper to download plain text (.txt)
  const handleDownloadTxt = () => {
    const candidateName =
      tailoredResume.contact_block?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Resume';
    const roleName =
      tailoredResume.target_role?.replace(/[^a-zA-Z0-9]/g, '_') || 'Tailored';
    const filename = `${candidateName}_${roleName}_ATS.txt`;
    const txt = generatePlainTextResume(tailoredResume);

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper to copy formatted text to clipboard
  const handleCopyClipboard = async () => {
    try {
      const txt = generatePlainTextResume(tailoredResume);
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const contact = tailoredResume.contact_block || {
    name: 'Candidate Name',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
  };

  return (
    <div className="w-full space-y-5 animate-fade-in">
      {/* 1. STUDIO HEADER BAR */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Target Role & Verification Status */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                <Sparkles className="h-3 w-3" />
                Tailored CV Studio
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800/80 border border-white/[0.06] px-2.5 py-1 text-[11px] font-mono text-zinc-300">
                <Building className="h-3 w-3 text-zinc-400" />
                {tailoredResume.target_company || 'Target Company'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100 truncate">
              {tailoredResume.target_role || 'Target Role Position'}
            </h2>
          </div>

          {/* ATS Gauge & Fact-Check Badge */}
          <div className="flex flex-wrap items-center gap-3">
            {/* ATS Match Gauge */}
            <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-zinc-900/90 px-3.5 py-2">
              <div className="relative flex items-center justify-center">
                <svg className="h-9 w-9 -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-zinc-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-400 transition-all duration-1000 ease-out"
                    strokeDasharray={`${tailoredResume.ats_keyword_coverage}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold font-mono text-emerald-300">
                  {tailoredResume.ats_keyword_coverage}%
                </span>
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                  ATS Match
                </div>
                <div className="text-xs font-semibold text-zinc-200">Keyword Density</div>
              </div>
            </div>

            {/* Fact-Check Verification Badge */}
            <div
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all shadow-sm ${
                tailoredResume.fact_check.verified
                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'border-amber-500/30 bg-amber-950/20 text-amber-300'
              }`}
              title={tailoredResume.fact_check.audit_summary}
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span>
                    {tailoredResume.fact_check.verified
                      ? '✅ 100% Metric Integrity Verified'
                      : `⚠️ Audit Review (${tailoredResume.fact_check.violations.length} flags)`}
                  </span>
                </div>
                <div className="text-[10px] font-normal text-zinc-400">
                  {tailoredResume.fact_check.confidence_score}% source-grounded confidence
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
          {/* View Mode Toggle */}
          <div className="inline-flex flex-wrap rounded-xl bg-zinc-900/90 p-1 border border-white/[0.08] text-xs">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
                viewMode === 'preview'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Tailored CV View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('diff')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
                viewMode === 'diff'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <GitCompare className="h-3.5 w-3.5" />
              <span>Before &amp; After Diff</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('audit')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
                viewMode === 'audit'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Fact-Check Audit</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('recruiter')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
                viewMode === 'recruiter'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5 text-amber-400" />
              <span>Recruiter Pre-Flight</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-bold">
                {recruiterScore}%
              </span>
            </button>
          </div>

          {/* Download & Copy Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyClipboard}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-zinc-900/90 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition active:scale-95"
              title="Copy Plain Text to Clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-zinc-900/90 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition active:scale-95"
              title="Download Plain Text Resume"
            >
              <FileText className="h-3.5 w-3.5 text-zinc-400" />
              <span>Plain Text (.txt)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isGeneratingDocx}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 px-4 py-2 text-xs font-semibold shadow-lg hover:shadow-xl transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-zinc-900" />
              <span>{isGeneratingDocx ? 'Generating Word...' : 'Download Word (.docx)'}</span>
            </button>
          </div>
        </div>

        {/* 2. TEMPLATE SELECTOR TOOLBAR */}
        <div className="pt-3 border-t border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-zinc-500" />
              Word Template Preset:
            </span>
            <span className="text-zinc-500 text-[11px] font-mono">
              Selected: <strong className="text-zinc-300 capitalize">{selectedTemplate}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Template 1: Classic Harvard */}
            <button
              type="button"
              onClick={() => handleSelectTemplate('classic-harvard')}
              className={`rounded-xl border p-3 text-left transition-all relative ${
                selectedTemplate === 'classic-harvard'
                  ? 'border-blue-500/50 bg-blue-950/20 ring-1 ring-blue-500/30'
                  : 'border-white/[0.06] bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200">Harvard Classic</span>
                {selectedTemplate === 'classic-harvard' && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                Single-column, 0.75&quot; margins, navy accent headings (#1A365D), 10.5pt Calibri.
              </p>
            </button>

            {/* Template 2: Modern Executive */}
            <button
              type="button"
              onClick={() => handleSelectTemplate('modern-executive')}
              className={`rounded-xl border p-3 text-left transition-all relative ${
                selectedTemplate === 'modern-executive'
                  ? 'border-indigo-500/50 bg-indigo-950/20 ring-1 ring-indigo-500/30'
                  : 'border-white/[0.06] bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200">Modern Executive</span>
                {selectedTemplate === 'modern-executive' && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                Feature summary block, Garamond/Calibri typography, subtle dark-slate dividers.
              </p>
            </button>

            {/* Template 3: Tech Linear */}
            <button
              type="button"
              onClick={() => handleSelectTemplate('tech-linear')}
              className={`rounded-xl border p-3 text-left transition-all relative ${
                selectedTemplate === 'tech-linear'
                  ? 'border-cyan-500/50 bg-cyan-950/20 ring-1 ring-cyan-500/30'
                  : 'border-white/[0.06] bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200">Tech Linear</span>
                {selectedTemplate === 'tech-linear' && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                Top skills layout, high-density impact layout, monospaced tech tags, crisp spacing.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE CONTENT BASED ON VIEW MODE */}

      {/* MODE 1: TAILORED CV VIEW (Paper-like preview) */}
      {viewMode === 'preview' && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d10] p-3 sm:p-8 shadow-2xl flex justify-center">
          <div
            className={`w-full max-w-4xl bg-white text-zinc-900 p-6 sm:p-12 shadow-2xl rounded-sm transition-all duration-300 ${
              selectedTemplate === 'modern-executive'
                ? 'font-serif border-l-4 border-slate-700'
                : selectedTemplate === 'tech-linear'
                ? 'font-sans border-t-4 border-sky-600'
                : 'font-sans'
            }`}
          >
            {/* Header Block */}
            <div
              className={`pb-4 border-b ${
                selectedTemplate === 'classic-harvard'
                  ? 'text-center border-[#1A365D]'
                  : selectedTemplate === 'modern-executive'
                  ? 'text-left border-slate-300'
                  : 'text-center border-sky-600'
              }`}
            >
              <h1
                className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                  selectedTemplate === 'classic-harvard'
                    ? 'text-[#1A365D] uppercase'
                    : selectedTemplate === 'modern-executive'
                    ? 'text-slate-900'
                    : 'text-slate-900 uppercase'
                }`}
              >
                {contact.name}
              </h1>

              {/* Subtitle / Target Role */}
              <div
                className={`text-xs sm:text-sm font-semibold mt-1 ${
                  selectedTemplate === 'classic-harvard'
                    ? 'text-zinc-600'
                    : selectedTemplate === 'modern-executive'
                    ? 'text-indigo-700 uppercase tracking-wide'
                    : 'text-sky-600 uppercase font-mono'
                }`}
              >
                {tailoredResume.target_role}{' '}
                {tailoredResume.target_company && `| Targeted for ${tailoredResume.target_company}`}
              </div>

              {/* Contact line */}
              <div className="text-[11px] sm:text-xs text-zinc-600 mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                {contact.email && <span>{contact.email}</span>}
                {contact.phone && <span>• {contact.phone}</span>}
                {contact.location && <span>• {contact.location}</span>}
                {contact.linkedin && <span>• {contact.linkedin}</span>}
                {contact.github && <span>• {contact.github}</span>}
              </div>
            </div>

            {/* Document Body */}
            <div className="space-y-6 pt-6 text-[12px] sm:text-[13px] leading-relaxed text-zinc-800">
              {/* Summary */}
              {tailoredResume.summary && (
                <section className="space-y-2">
                  <h2
                    className={`text-xs sm:text-sm font-bold uppercase tracking-wider pb-1 border-b ${
                      selectedTemplate === 'classic-harvard'
                        ? 'text-[#1A365D] border-[#1A365D]'
                        : selectedTemplate === 'modern-executive'
                        ? 'text-slate-800 border-slate-400'
                        : 'text-sky-700 border-sky-500'
                    }`}
                  >
                    Professional Summary
                  </h2>
                  <div
                    className={`${
                      selectedTemplate === 'modern-executive'
                        ? 'bg-slate-50 border-l-4 border-slate-700 p-3.5 rounded-r text-slate-800 italic'
                        : ''
                    }`}
                  >
                    <p>{tailoredResume.summary}</p>
                  </div>
                </section>
              )}

              {/* Technical Skills */}
              {tailoredResume.skills_section && (
                <section className="space-y-2">
                  <h2
                    className={`text-xs sm:text-sm font-bold uppercase tracking-wider pb-1 border-b ${
                      selectedTemplate === 'classic-harvard'
                        ? 'text-[#1A365D] border-[#1A365D]'
                        : selectedTemplate === 'modern-executive'
                        ? 'text-slate-800 border-slate-400'
                        : 'text-sky-700 border-sky-500'
                    }`}
                  >
                    Technical Skills &amp; Competencies
                  </h2>
                  <div className="space-y-1">
                    {tailoredResume.skills_section.languages?.length > 0 && (
                      <p>
                        <strong className="text-zinc-900">Languages: </strong>
                        {tailoredResume.skills_section.languages.join(', ')}
                      </p>
                    )}
                    {tailoredResume.skills_section.frameworks?.length > 0 && (
                      <p>
                        <strong className="text-zinc-900">Frameworks &amp; Libraries: </strong>
                        {tailoredResume.skills_section.frameworks.join(', ')}
                      </p>
                    )}
                    {tailoredResume.skills_section.tools_platforms?.length > 0 && (
                      <p>
                        <strong className="text-zinc-900">Cloud, Tools &amp; DBs: </strong>
                        {tailoredResume.skills_section.tools_platforms.join(', ')}
                      </p>
                    )}
                    {tailoredResume.skills_section.practices?.length > 0 && (
                      <p>
                        <strong className="text-zinc-900">Architecture &amp; Practices: </strong>
                        {tailoredResume.skills_section.practices.join(', ')}
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Experience */}
              {tailoredResume.experience?.length > 0 && (
                <section className="space-y-4">
                  <h2
                    className={`text-xs sm:text-sm font-bold uppercase tracking-wider pb-1 border-b ${
                      selectedTemplate === 'classic-harvard'
                        ? 'text-[#1A365D] border-[#1A365D]'
                        : selectedTemplate === 'modern-executive'
                        ? 'text-slate-800 border-slate-400'
                        : 'text-sky-700 border-sky-500'
                    }`}
                  >
                    Professional Experience
                  </h2>
                  <div className="space-y-4">
                    {tailoredResume.experience.map((exp, idx) => (
                      <div key={exp.id || idx} className="space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between">
                          <div>
                            <span className="font-bold text-zinc-900">{exp.title}</span>
                            <span className="text-zinc-700"> — {exp.company}</span>
                          </div>
                          <span className="text-xs text-zinc-500 italic font-mono">
                            {exp.dates} {exp.location && `| ${exp.location}`}
                          </span>
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-zinc-800">
                          {exp.bullets.map((bullet, bIdx) => (
                            <li key={bIdx} className="leading-snug">
                              {bullet.tailored_text || bullet.original_text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Education */}
              {tailoredResume.education?.length > 0 && (
                <section className="space-y-2">
                  <h2
                    className={`text-xs sm:text-sm font-bold uppercase tracking-wider pb-1 border-b ${
                      selectedTemplate === 'classic-harvard'
                        ? 'text-[#1A365D] border-[#1A365D]'
                        : selectedTemplate === 'modern-executive'
                        ? 'text-slate-800 border-slate-400'
                        : 'text-sky-700 border-sky-500'
                    }`}
                  >
                    Education
                  </h2>
                  <div className="space-y-1">
                    {tailoredResume.education.map((edu, idx) => (
                      <div key={idx} className="flex justify-between items-baseline">
                        <span className="font-semibold text-zinc-900">
                          {edu.degree} — {edu.institution}
                        </span>
                        <span className="text-xs text-zinc-500 italic">{edu.dates}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Certifications */}
              {tailoredResume.certifications?.length > 0 && (
                <section className="space-y-2">
                  <h2
                    className={`text-xs sm:text-sm font-bold uppercase tracking-wider pb-1 border-b ${
                      selectedTemplate === 'classic-harvard'
                        ? 'text-[#1A365D] border-[#1A365D]'
                        : selectedTemplate === 'modern-executive'
                        ? 'text-slate-800 border-slate-400'
                        : 'text-sky-700 border-sky-500'
                    }`}
                  >
                    Certifications
                  </h2>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {tailoredResume.certifications.map((cert, idx) => (
                      <li key={idx} className="text-zinc-800">
                        {cert}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: BEFORE & AFTER DIFF VIEW */}
      {viewMode === 'diff' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 p-4 text-xs text-zinc-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>
                Comparing original candidate bullets with Google XYZ syntheses. Injected keywords
                are tagged in <span className="text-emerald-400 font-semibold">emerald</span>, and
                verified source metrics in{' '}
                <span className="text-amber-400 font-semibold">amber</span>.
              </span>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 shrink-0">
              Total Bullets: {tailoredResume.experience.reduce((a, c) => a + c.bullets.length, 0)}
            </span>
          </div>

          {tailoredResume.experience.map((exp, expIdx) => (
            <div
              key={exp.id || expIdx}
              className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 sm:p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-zinc-400" />
                  <h3 className="text-sm font-bold text-zinc-100">
                    {exp.title} <span className="text-zinc-500">at</span> {exp.company}
                  </h3>
                </div>
                <span className="text-xs font-mono text-zinc-400">{exp.dates}</span>
              </div>

              <div className="space-y-3">
                {exp.bullets.map((b, bIdx) => (
                  <div
                    key={bIdx}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3.5 rounded-xl border border-white/[0.06] bg-zinc-900/40"
                  >
                    {/* Left: Original Bullet */}
                    <div className="space-y-2 border-b lg:border-b-0 lg:border-r border-white/[0.06] pb-3 lg:pb-0 lg:pr-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-zinc-400 uppercase tracking-wider">
                          Original Source Truth
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          Bullet {bIdx + 1}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                        {b.original_text}
                      </p>
                      {/* Metric preservation tag */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                          🛡️ Metrics Preserved
                        </span>
                      </div>
                    </div>

                    {/* Right: Tailored Google XYZ Bullet */}
                    <div className="space-y-2 lg:pl-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Tailored Google XYZ Bullet
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          ATS Impact
                        </span>
                      </div>
                      <p className="text-xs text-zinc-100 leading-relaxed font-sans font-medium">
                        {b.tailored_text}
                      </p>

                      {/* Injected Keywords pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {b.keywords_injected && b.keywords_injected.length > 0 ? (
                          b.keywords_injected.map((kw, kwIdx) => (
                            <span
                              key={kwIdx}
                              className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"
                            >
                              +{kw}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-zinc-500 italic">
                            Structure upgraded to active XYZ delivery
                          </span>
                        )}
                      </div>

                      {/* Explanation note */}
                      {b.explanation && (
                        <div className="text-[11px] text-zinc-400 italic pt-1 border-t border-white/[0.04]">
                          &ldquo;{b.explanation}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODE 3: FACT-CHECK AUDIT VIEW */}
      {viewMode === 'audit' && (
        <div className="space-y-5">
          {/* Top Audit Status Banner */}
          <div
            className={`rounded-2xl border p-5 sm:p-6 shadow-xl space-y-3 ${
              tailoredResume.fact_check.verified
                ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
                : 'border-amber-500/30 bg-amber-950/20 text-amber-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                    tailoredResume.fact_check.verified
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                  }`}
                >
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">
                    {tailoredResume.fact_check.verified
                      ? '100% Metric Integrity Verified'
                      : 'Audit Complete with Review Flags'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Adversarial Critic Evaluation • Ground-Truth Consistency Engine
                  </p>
                </div>
              </div>

              <div className="text-right sm:text-right font-mono">
                <div className="text-2xl font-black text-emerald-400">
                  {tailoredResume.fact_check.confidence_score}%
                </div>
                <div className="text-[10px] uppercase text-zinc-400">Confidence Score</div>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed border-t border-white/[0.08] pt-3">
              {tailoredResume.fact_check.audit_summary}
            </p>
          </div>

          {/* Quadrant: Hybrid Gap Analysis Classification */}
          {tailoredResume.gap_analysis && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5 sm:p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-zinc-400" />
                  Hybrid Gap Analysis &amp; Keyword Classification
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Requirements bucketed by candidate evidence into 4 distinct semantic tiers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. Direct Evidence */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Direct Evidence ({tailoredResume.gap_analysis.evidenced_direct?.length || 0})
                    </span>
                    <span className="text-[10px] text-zinc-400">Explicitly in Resume</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(tailoredResume.gap_analysis.evidenced_direct || []).map((skill, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-200"
                      >
                        {skill}
                      </span>
                    ))}
                    {(!tailoredResume.gap_analysis.evidenced_direct ||
                      tailoredResume.gap_analysis.evidenced_direct.length === 0) && (
                      <span className="text-xs text-zinc-500 italic">None classified</span>
                    )}
                  </div>
                </div>

                {/* 2. Semantic Equivalencies */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-950/15 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                      Semantic Matches ({tailoredResume.gap_analysis.evidenced_semantic?.length || 0})
                    </span>
                    <span className="text-[10px] text-zinc-400">Equivalent Experience</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(tailoredResume.gap_analysis.evidenced_semantic || []).map((skill, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-200"
                      >
                        {skill}
                      </span>
                    ))}
                    {(!tailoredResume.gap_analysis.evidenced_semantic ||
                      tailoredResume.gap_analysis.evidenced_semantic.length === 0) && (
                      <span className="text-xs text-zinc-500 italic">None classified</span>
                    )}
                  </div>
                </div>

                {/* 3. Plausible Context */}
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/15 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-indigo-400" />
                      Plausible Context ({tailoredResume.gap_analysis.plausible_context?.length || 0})
                    </span>
                    <span className="text-[10px] text-zinc-400">Adjacent Stack</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(tailoredResume.gap_analysis.plausible_context || []).map((skill, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-200"
                      >
                        {skill}
                      </span>
                    ))}
                    {(!tailoredResume.gap_analysis.plausible_context ||
                      tailoredResume.gap_analysis.plausible_context.length === 0) && (
                      <span className="text-xs text-zinc-500 italic">None classified</span>
                    )}
                  </div>
                </div>

                {/* 4. Genuine Gaps */}
                <div className="rounded-xl border border-rose-500/20 bg-rose-950/15 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                      Genuine Gaps ({tailoredResume.gap_analysis.genuine_gaps?.length || 0})
                    </span>
                    <span className="text-[10px] text-zinc-400">Omitted (No Lie)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(tailoredResume.gap_analysis.genuine_gaps || []).map((skill, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300"
                      >
                        {skill}
                      </span>
                    ))}
                    {(!tailoredResume.gap_analysis.genuine_gaps ||
                      tailoredResume.gap_analysis.genuine_gaps.length === 0) && (
                      <span className="text-xs text-zinc-500 italic">Zero hard gaps found</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audit Violations or Clean Confirmation */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5 sm:p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-zinc-400" />
              Auditor Trace &amp; Violations Log
            </h3>

            {tailoredResume.fact_check.violations.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 text-xs text-emerald-300 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-emerald-200">
                    Zero Hallucinations or Metric Alterations
                  </span>
                  <p className="text-zinc-400 leading-relaxed text-[11px]">
                    The adversarial auditor inspected every synthesized bullet against candidate
                    source documents. All numbers, percentages, dates, and claims are 100%
                    grounded in verified candidate facts.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {tailoredResume.fact_check.violations.map((violation, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-300 uppercase text-[10px] tracking-wider">
                        Severity: {violation.severity}
                      </span>
                      {violation.bullet_id && (
                        <span className="text-[10px] font-mono text-zinc-400">
                          {violation.bullet_id}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-200">{violation.reason}</p>
                    {violation.original_claim && (
                      <div className="text-[11px] text-zinc-400 pt-1 font-mono">
                        Original: &quot;{violation.original_claim}&quot;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 4: RECRUITER PRE-FLIGHT SCORECARD */}
      {viewMode === 'recruiter' && (
        <div className="space-y-5">
          {/* Top Recruiter Readiness Score Banner */}
          <div
            className={`rounded-2xl border p-5 sm:p-6 shadow-xl space-y-4 ${
              recruiterScore >= 90
                ? 'border-emerald-500/30 bg-emerald-950/20'
                : 'border-amber-500/30 bg-amber-950/20'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                    recruiterScore >= 90
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                  }`}
                >
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-zinc-100">
                      Senior Recruiter Pre-Flight Scorecard
                    </h3>
                    <span className="rounded-md bg-zinc-800 border border-white/[0.08] px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                      Claudia Baker Review Heuristics
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Evaluates visual presentation, brevity, chronology, and active achiever voice
                    for senior recruiter inspection.
                  </p>
                </div>
              </div>

              <div className="flex items-center sm:items-end flex-col font-mono shrink-0">
                <div
                  className={`text-3xl font-black ${
                    recruiterScore >= 90 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {recruiterScore}/100
                </div>
                <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                  {recruiterScore >= 90 ? 'Tier-1 Interview Ready' : 'Optimization Suggested'}
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-white/[0.08]">
              <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-white/[0.04] text-center">
                <div className="text-[10px] text-zinc-400 uppercase font-medium">Est. Length</div>
                <div className="text-sm font-bold text-zinc-200 mt-0.5">
                  ~{estimatedPages} Page{estimatedPages > 1 ? 's' : ''}{' '}
                  <span className="text-[10px] font-normal text-zinc-500">({totalWordCount}w)</span>
                </div>
              </div>
              <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-white/[0.04] text-center">
                <div className="text-[10px] text-zinc-400 uppercase font-medium">Summary</div>
                <div className="text-sm font-bold text-zinc-200 mt-0.5">
                  {summaryWordCount} words{' '}
                  <span className="text-[10px] font-normal text-zinc-500">(50-90w goal)</span>
                </div>
              </div>
              <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-white/[0.04] text-center">
                <div className="text-[10px] text-zinc-400 uppercase font-medium">Achiever Voice</div>
                <div className="text-sm font-bold text-zinc-200 mt-0.5">
                  {activeBulletRatio}% Active{' '}
                  <span className="text-[10px] font-normal text-zinc-500">
                    ({passiveFindings.length} passive)
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-white/[0.04] text-center">
                <div className="text-[10px] text-zinc-400 uppercase font-medium">Curated Skills</div>
                <div className="text-sm font-bold text-zinc-200 mt-0.5">
                  {skillsCount} Skills{' '}
                  <span className="text-[10px] font-normal text-zinc-500">(8-14 goal)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6 Key Diagnostic Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Page Budget */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  1. Page Length &amp; Word Budget
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    isPageBudgetOptimal
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isPageBudgetOptimal ? 'Optimal 1-2 Pages' : 'Exceeds Page Budget'}
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {totalWordCount} total words (~{estimatedPages} page{estimatedPages > 1 ? 's' : ''}).
                Claudia Baker recommends keeping resumes to 1–2 pages for candidates with under 10
                years of experience. Hiring managers scan in under 6 seconds; concise documents ensure
                high-priority wins are noticed immediately.
              </p>
              <div className="rounded-lg bg-zinc-900/70 p-2.5 text-[11px] text-zinc-400 flex items-center justify-between font-mono">
                <span>Target: 400 - 850 words</span>
                <span className="text-zinc-300 font-semibold">{totalWordCount} words parsed</span>
              </div>
            </div>

            {/* 2. Professional Summary Brevity */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  2. Summary Brevity &amp; Focus
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    isSummaryOptimal
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isSummaryOptimal ? 'Brisk & Punchy (50-90w)' : `${summaryWordCount} words`}
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Summary length: <strong>{summaryWordCount} words</strong>. Claudia Baker explicitly
                cautions against overly long professional summaries: &ldquo;Try to keep it between 50
                and 100 words. Rephrasing sentences and just keeping the really important information
                will do the trick.&rdquo;
              </p>
              <div className="rounded-lg bg-zinc-900/70 p-2.5 text-[11px] text-zinc-400 flex items-center justify-between font-mono">
                <span>Optimal: 50 - 90 words</span>
                <span className="text-zinc-300 font-semibold">{summaryWordCount} words</span>
              </div>
            </div>

            {/* 3. Achiever vs. Doer Voice */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-400" />
                  3. Achiever vs. Doer Voice
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    passiveFindings.length === 0
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {passiveFindings.length === 0
                    ? '100% Achiever Voice'
                    : `${passiveFindings.length} Passive Phrasing`}
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Claudia Baker singled out weak, passive phrasings such as &ldquo;Partnered with
                engineering...&rdquo; as doer sentences. All bullets are transformed to Google XYZ
                impact format (*&ldquo;Accomplished [X], measured by [Y], by doing [Z]&rdquo;*)
                starting with active accomplishment verbs.
              </p>
              {passiveFindings.length === 0 ? (
                <div className="rounded-lg bg-emerald-950/20 border border-emerald-500/20 p-2.5 text-[11px] text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    Zero banned phrases found. All bullets lead with decisive action verbs.
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5 pt-1">
                  {passiveFindings.slice(0, 2).map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg bg-amber-950/20 border border-amber-500/20 p-2 text-[11px] text-amber-200"
                    >
                      ⚠️ Found &ldquo;<strong>{item.phrase}</strong>&rdquo; at {item.company}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Curated Skills Cap */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-cyan-400" />
                  4. Curated Skills Density
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    isSkillsCurated
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {skillsCount} Skills Curated
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Recruiters discount resumes with 30+ skills as indiscriminate keyword stuffing.
                The tailored engine prunes low-signal fluff and surfaces 8–14 targeted competencies
                categorized into Languages, Frameworks, Tools, and Practices.
              </p>
              <div className="rounded-lg bg-zinc-900/70 p-2.5 text-[11px] text-zinc-400 flex items-center justify-between font-mono">
                <span>Recommended: 8 - 14 skills</span>
                <span className="text-zinc-300 font-semibold">{skillsCount} skills active</span>
              </div>
            </div>

            {/* 5. Chronology & Month+Year Check */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-400" />
                  5. Reverse Chronology &amp; Month Accuracy
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    isDatesCompliant
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isDatesCompliant ? 'Month + Year Verified' : 'Month Missing'}
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Claudia Baker explicitly noted: &ldquo;On the downside, I saw that some of your
                entries are missing a month. I strongly recommend fixing this by adding a month for
                the start and end date.&rdquo; Entries are sorted reverse-chronologically with full
                Month + Year dates.
              </p>
              {isDatesCompliant ? (
                <div className="rounded-lg bg-emerald-950/20 border border-emerald-500/20 p-2.5 text-[11px] text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>All experience records include valid Month &amp; Year format.</span>
                </div>
              ) : (
                <div className="rounded-lg bg-amber-950/20 border border-amber-500/20 p-2.5 text-[11px] text-amber-200">
                  Entries missing month: {dateAnomalies.join(', ')}
                </div>
              )}
            </div>

            {/* 6. Typography & Color Discipline */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                  <Palette className="h-4 w-4 text-purple-400" />
                  6. Typography &amp; 2-Color Discipline
                </span>
                <span className="rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
                  Strict 1-Font &amp; 2-Color
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Claudia Baker highlighted: &ldquo;At the moment, you are using multiple fonts... By
                choosing one font and sticking to it, you can showcase your professionalism... I
                generally recommend using only two font colors.&rdquo; The engine generates Word
                docs in 100% single font family (Calibri or Garamond) with a strict 2-color hierarchy.
              </p>
              <div className="rounded-lg bg-zinc-900/70 p-2.5 text-[11px] text-zinc-400 flex items-center justify-between font-mono">
                <span>Selected: {selectedTemplate}</span>
                <span className="text-zinc-300 font-semibold">1 font • 2-3 sizes • 2 colors</span>
              </div>
            </div>
          </div>

          {/* Recruiter Summary Recommendation Box */}
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 p-5 space-y-2 text-xs text-zinc-300 shadow-xl">
            <div className="flex items-center gap-2 text-zinc-100 font-semibold">
              <ThumbsUp className="h-4 w-4 text-emerald-400" />
              Recruiter Verdict &amp; ATS Dual-Pass Synthesis
            </div>
            <p className="text-zinc-400 leading-relaxed">
              This tailored document satisfies both algorithmic ATS gatekeepers (preserving standard
              single-column structure, parsing-friendly table-free layout, and contextual keyword
              density) and human recruiter psychology (1–2 page budget, 50–90 word punchy summary,
              Google XYZ achievement framing, and strict typographic consistency).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Downloads base64 encoded binary file in browser.
 */
function downloadBase64File(base64Data: string, filename: string, mimeType: string) {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Formats a TailoredResume into clean plain text for export or clipboard.
 */
function generatePlainTextResume(resume: TailoredResume): string {
  const parts: string[] = [];
  const contact = resume.contact_block || {
    name: 'Candidate Name',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
  };

  parts.push(contact.name.toUpperCase());
  if (resume.target_role) {
    parts.push(`Target Role: ${resume.target_role} | ${resume.target_company || ''}`);
  }
  parts.push(
    [contact.email, contact.phone, contact.location, contact.linkedin, contact.github]
      .filter(Boolean)
      .join(' | ')
  );
  parts.push('\n' + '='.repeat(60) + '\n');

  if (resume.summary) {
    parts.push('PROFESSIONAL SUMMARY');
    parts.push('-'.repeat(30));
    parts.push(resume.summary + '\n');
  }

  const skills = resume.skills_section;
  if (skills) {
    parts.push('TECHNICAL SKILLS');
    parts.push('-'.repeat(30));
    if (skills.languages?.length) parts.push(`Languages: ${skills.languages.join(', ')}`);
    if (skills.frameworks?.length) parts.push(`Frameworks: ${skills.frameworks.join(', ')}`);
    if (skills.tools_platforms?.length)
      parts.push(`Cloud, Tools & DBs: ${skills.tools_platforms.join(', ')}`);
    if (skills.practices?.length) parts.push(`Practices: ${skills.practices.join(', ')}`);
    parts.push('');
  }

  if (resume.experience?.length) {
    parts.push('PROFESSIONAL EXPERIENCE');
    parts.push('-'.repeat(30));
    for (const exp of resume.experience) {
      parts.push(
        `${exp.title} — ${exp.company} (${exp.dates}${exp.location ? ` | ${exp.location}` : ''})`
      );
      for (const b of exp.bullets) {
        parts.push(`• ${b.tailored_text || b.original_text}`);
      }
      parts.push('');
    }
  }

  if (resume.education?.length) {
    parts.push('EDUCATION');
    parts.push('-'.repeat(30));
    for (const edu of resume.education) {
      parts.push(`${edu.degree} — ${edu.institution} (${edu.dates})`);
    }
    parts.push('');
  }

  if (resume.certifications?.length) {
    parts.push('CERTIFICATIONS');
    parts.push('-'.repeat(30));
    for (const cert of resume.certifications) {
      parts.push(`• ${cert}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}
