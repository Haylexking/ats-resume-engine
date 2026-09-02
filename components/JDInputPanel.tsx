'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Sparkles,
  FileText,
  Upload,
  Clipboard,
  FileUp,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { AISettingConfig } from '@/lib/engine/types';

export interface AnalyzePayload {
  jdText: string;
  resumeText: string;
}

interface JDInputPanelProps {
  onAnalyze: (payload: AnalyzePayload) => void;
  isLoading: boolean;
  aiSettings?: AISettingConfig;
  onOpenSettings?: () => void;
}

export const JDInputPanel: React.FC<JDInputPanelProps> = ({
  onAnalyze,
  isLoading,
  aiSettings,
  onOpenSettings,
}) => {
  // Universal Job Description state
  const [jdText, setJdText] = useState('');

  // Universal Resume state
  const [resumeMode, setResumeMode] = useState<'upload' | 'paste'>('upload');
  const [resumeText, setResumeText] = useState('');
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

      setResumeText(data.extractedText);
      setUploadedFileName(file.name);
      setResumeMode('paste'); // Reveal extracted text for transparency and easy tweaking
    } catch (err: any) {
      setUploadError(err.message || 'Error parsing document');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasteClipboardJD = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setJdText(text);
    } catch (err) {
      // Clipboard permission denied or unavailable
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdText.trim() || !resumeText.trim()) return;

    onAnalyze({
      jdText,
      resumeText,
    });
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 sm:p-6 shadow-2xl backdrop-blur-md">
      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        {/* Two-Panel Universal Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {/* PANEL 1: TARGET JOB DESCRIPTION */}
          <div className="space-y-2.5 sm:space-y-3 flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-zinc-300 shrink-0" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 truncate">
                  1. Target Job Description
                </h2>
              </div>

              <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                {jdText && (
                  <button
                    type="button"
                    onClick={() => setJdText('')}
                    className="flex items-center space-x-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition px-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePasteClipboardJD}
                  className="flex items-center space-x-1 rounded-md border border-white/[0.06] bg-zinc-900 px-2 sm:px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 transition active:scale-95"
                >
                  <Clipboard className="h-3 w-3" />
                  <span>Paste JD</span>
                </button>
              </div>
            </div>

            <div className="relative flex-1">
              <textarea
                rows={12}
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste any Job Description here (Engineering, Product, Design, Healthcare, Marketing, Sales, Operations, Finance, Legal, etc.)..."
                className="w-full h-full min-h-[260px] sm:min-h-[360px] rounded-xl border border-white/[0.08] bg-[#09090b] p-3.5 sm:p-4 font-mono text-xs leading-relaxed text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-all resize-none shadow-inner"
              />
            </div>
          </div>

          {/* PANEL 2: CANDIDATE RESUME */}
          <div className="space-y-2.5 sm:space-y-3 flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Upload className="h-4 w-4 text-zinc-300 shrink-0" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 truncate">
                  2. Candidate Resume
                </h2>
              </div>

              {/* Mode Toggle Pills */}
              <div className="flex rounded-lg border border-white/[0.08] bg-[#09090b] p-0.5 text-[11px] shrink-0">
                <button
                  type="button"
                  onClick={() => setResumeMode('upload')}
                  className={`flex items-center space-x-1 sm:space-x-1.5 rounded-md px-2 sm:px-3 py-1 font-medium transition ${
                    resumeMode === 'upload'
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Upload className="h-3 w-3" />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResumeMode('paste')}
                  className={`flex items-center space-x-1 sm:space-x-1.5 rounded-md px-2 sm:px-3 py-1 font-medium transition ${
                    resumeMode === 'paste'
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Clipboard className="h-3 w-3" />
                  <span>Paste Text</span>
                </button>
              </div>
            </div>

            {/* Resume Mode View 1: Upload File */}
            {resumeMode === 'upload' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className="flex-1 min-h-[260px] sm:min-h-[360px] flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-[#09090b]/60 p-5 sm:p-8 text-center cursor-pointer transition hover:border-zinc-500 hover:bg-[#09090b]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-400 mb-2.5 sm:mb-3 shadow-md">
                  {isUploading ? (
                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-emerald-400" />
                  ) : (
                    <FileUp className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-zinc-200">
                  {isUploading ? 'Extracting Clean Text...' : 'Upload your Resume'}
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-500 mt-1 max-w-xs px-2">
                  Drag &amp; drop PDF or Word (.docx) document here, or click to browse.
                </p>

                {uploadError && (
                  <div className="mt-3 sm:mt-4 flex items-center space-x-1.5 text-xs text-rose-400 bg-rose-950/40 border border-rose-500/20 px-3 py-1.5 rounded-lg text-left">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="break-words">{uploadError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Resume Mode View 2: Paste Raw Text */}
            {resumeMode === 'paste' && (
              <div className="relative flex-1 flex flex-col space-y-2">
                {uploadedFileName && (
                  <div className="flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-1.5 text-xs border border-white/[0.06] gap-2">
                    <span className="text-zinc-300 font-medium truncate text-[11px] sm:text-xs">
                      File: <strong>{uploadedFileName}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFileName(null);
                        setResumeText('');
                      }}
                      className="text-zinc-500 hover:text-zinc-300 text-[11px] shrink-0"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <textarea
                  rows={12}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste candidate resume text directly here (or upload a PDF/Word file above)..."
                  className="w-full flex-1 min-h-[260px] sm:min-h-[320px] rounded-xl border border-white/[0.08] bg-[#09090b] p-3.5 sm:p-4 font-mono text-xs leading-relaxed text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-all resize-none shadow-inner"
                />
              </div>
            )}
          </div>
        </div>

        {/* Live Loading Progress Bar & Latency Feedback */}
        {isLoading && (
          <div className="rounded-xl border border-white/[0.08] bg-zinc-900/90 p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 animate-fade-in shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
                <Sparkles className="h-4 w-4 text-emerald-400 animate-spin shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-zinc-200 truncate block">
                    {elapsedSeconds < 4
                      ? 'Step 1/3: Extracting JD Structure...'
                      : elapsedSeconds < 12
                      ? 'Step 2/3: Computing 3-Pass ATS Matching...'
                      : 'Step 3/3: Synthesizing Recruiter Rewrites...'}
                  </span>
                  <div className="text-[10px] sm:text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 sm:gap-2 mt-0.5">
                    <span className="truncate max-w-[150px] sm:max-w-none">
                      Model: {aiSettings?.modelReason || aiSettings?.model || 'Active AI Model'}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold shrink-0">{elapsedSeconds}s elapsed</span>
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
            <div className="flex items-center space-x-2 rounded-lg bg-zinc-950/80 px-2.5 sm:px-3 py-2 border border-blue-500/20 text-[10px] sm:text-[11px] font-mono text-blue-300 overflow-hidden">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping shrink-0" />
              <span className="truncate">
                {elapsedSeconds < 4 && '🧠 Parsing JD syntax, seniority benchmarks, and core technical requirements...'}
                {elapsedSeconds >= 4 && elapsedSeconds < 9 && '🔍 Cross-referencing qualifications and hard skills with candidate experience...'}
                {elapsedSeconds >= 9 && elapsedSeconds < 16 && '⚖️ Evaluating 3-pass keyword frequency, semantic duty coverage, and score weights...'}
                {elapsedSeconds >= 16 && elapsedSeconds < 25 && '✍️ Synthesizing authentic Tier 1 bullet rewrites preserving candidate metrics...'}
                {elapsedSeconds >= 25 && '🎯 Formulating executive positioning strategy, interview talking points, and portfolio guidance...'}
              </span>
            </div>

            {/* Helper notice if elapsed > 15s */}
            {elapsedSeconds >= 15 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-zinc-400 bg-[#09090b] p-2.5 rounded-lg border border-white/[0.06] gap-1.5">
                <span>
                  Large reasoning models execute deep multi-stage evaluations.
                </span>
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 underline whitespace-nowrap text-left"
                  >
                    Switch AI Model
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Universal Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 border-t border-white/[0.06] gap-3">
          <div className="text-xs text-zinc-400 text-center sm:text-left">
            <span>
              {uploadedFileName
                ? `Ready: ${uploadedFileName}`
                : resumeText.trim()
                ? 'Ready to evaluate pasted candidate resume'
                : 'Upload or paste resume above to start'}
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading || !jdText.trim() || !resumeText.trim()}
            className="flex items-center justify-center space-x-2 rounded-xl bg-zinc-100 px-6 sm:px-7 py-3 text-xs font-semibold text-zinc-900 shadow-md transition-all hover:bg-white hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin text-zinc-900 shrink-0" />
                <span>Evaluating ATS Match ({elapsedSeconds}s)...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current text-zinc-900 shrink-0" />
                <span>Run ATS Match &amp; Gap Engine</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
