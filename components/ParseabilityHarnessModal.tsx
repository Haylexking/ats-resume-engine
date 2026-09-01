'use client';

import React from 'react';
import { X, FileCheck, AlertTriangle, Download, FileText, CheckCircle2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { ParseabilityResult, TargetIndustry } from '@/lib/engine/types';

interface ParseabilityHarnessModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ParseabilityResult | null;
  industry: TargetIndustry;
  onDownloadDocx: () => void;
  onDownloadTxt: () => void;
}

export const ParseabilityHarnessModal: React.FC<ParseabilityHarnessModalProps> = ({
  isOpen,
  onClose,
  result,
  industry,
  onDownloadDocx,
  onDownloadTxt,
}) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-3xl rounded-2xl border border-white/[0.08] bg-[#111114] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center space-x-2">
            <FileCheck className="h-4 w-4 text-zinc-300" />
            <h3 className="text-sm font-semibold text-zinc-100">
              ATS Raw-Extraction Parseability Harness
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Pass/Fail Status Banner */}
          <div
            className={`rounded-xl border p-4 flex items-center space-x-4 ${
              result.passed
                ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300'
                : 'border-rose-500/20 bg-rose-500/[0.06] text-rose-300'
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                result.passed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {result.passed ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-zinc-100">
                {result.passed
                  ? 'PASSED — Zero Extraction Warnings'
                  : 'BLOCKED — ATS Ingestion Diff Warnings Detected'}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Simulates raw plain-text extraction performed by Workday, Greenhouse, Taleo, and iCIMS parsers.
              </p>
            </div>
          </div>

          {/* Warnings List */}
          {result.diff_warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                Corrupted or Lost Content Flags:
              </h4>
              <div className="space-y-1">
                {result.diff_warnings.map((w, i) => (
                  <div
                    key={i}
                    className="text-xs text-rose-300 bg-rose-500/[0.06] p-2.5 rounded-lg border border-rose-500/20 font-mono"
                  >
                    • {w}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw Extracted Text View */}
          <div>
            <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Simulated Raw Plain Text Extraction:
            </h4>
            <pre className="w-full rounded-xl border border-white/[0.06] bg-[#09090b] p-4 font-mono text-[11px] text-zinc-300 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
              {result.raw_extracted_text}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/[0.06] bg-zinc-950 px-6 py-4">
          <button
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Close Inspector
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={onDownloadTxt}
              className="flex items-center space-x-1.5 rounded-lg border border-white/[0.08] bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition active:scale-[0.98]"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Download Text (.txt)</span>
            </button>
            <button
              onClick={onDownloadDocx}
              disabled={!result.passed}
              className="flex items-center space-x-1.5 rounded-lg bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-white disabled:opacity-40 shadow-sm transition active:scale-[0.98]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Word (.docx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
