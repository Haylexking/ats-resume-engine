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
  const [viewMode, setViewMode] = useState<'preview' | 'diff' | 'audit'>('preview');
  const [docxBase64, setDocxBase64] = useState<string | undefined>(initialDocxBase64);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [copied, setCopied] = useState(false);

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
          <div className="inline-flex rounded-xl bg-zinc-900/90 p-1 border border-white/[0.08] text-xs">
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
