'use client';

import React from 'react';
import { Sparkles, AlertCircle, CheckCircle2, XCircle, ShieldAlert, AlertTriangle } from 'lucide-react';
import { TieredSuggestion } from '@/lib/engine/types';

interface TieredSuggestionsDiffProps {
  suggestions: TieredSuggestion[];
  onToggleStatus: (id: string, newStatus: 'accepted' | 'rejected' | 'confirmed' | 'pending') => void;
}

export const TieredSuggestionsDiff: React.FC<TieredSuggestionsDiffProps> = ({
  suggestions,
  onToggleStatus,
}) => {
  const tier1 = suggestions.filter((s) => s.tier === 1);
  const tier2 = suggestions.filter((s) => s.tier === 2);
  const tier3 = suggestions.filter((s) => s.tier === 3);
  const reviewNeededCount = suggestions.filter((s) => s.needs_review).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-400" />
            3-Tier Optimization Engine Suggestions
          </h3>
          <p className="text-xs text-gray-400">
            Review recommendations below. Tier 2 additions require explicit candidate verification before exporting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            Tier 1: {tier1.length}
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
            Tier 2: {tier2.length}
          </span>
          <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">
            Tier 3: {tier3.length}
          </span>
          {reviewNeededCount > 0 && (
            <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-amber-300 font-bold flex items-center gap-1 animate-pulse">
              <AlertTriangle className="h-3 w-3" />
              Needs Review: {reviewNeededCount}
            </span>
          )}
        </div>
      </div>

      {/* Dual-Model Consensus Split Alert Banner */}
      {reviewNeededCount > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-300">
              Dual-Model Consensus Split ({reviewNeededCount} items flagged)
            </div>
            <p className="text-amber-200/90 text-[11px]">
              Primary and secondary AI models disagreed on tier classification for highlighted items. Review carefully before accepting or verifying.
            </p>
          </div>
        </div>
      )}

      {/* TIER 1: AUTO-SUGGEST REWRITES */}
      {tier1.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Tier 1 — Bullet Rewrites (Evidenced Skills)
            </h4>
            <span className="text-[10px] text-gray-400">Auto-suggest candidate</span>
          </div>

          <div className="space-y-3">
            {tier1.map((sug) => {
              const isAccepted = sug.status === 'accepted';
              return (
                <div
                  key={sug.id}
                  className={`rounded-2xl border p-5 transition-all ${
                    sug.needs_review
                      ? 'border-amber-500/50 bg-amber-950/20 ring-1 ring-amber-500/30'
                      : isAccepted
                      ? 'border-emerald-500/40 bg-emerald-950/10'
                      : 'border-gray-800 bg-slate-900/90'
                  }`}
                >
                  {/* Needs Review Badge */}
                  {sug.needs_review && (
                    <div className="mb-3 rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-[11px] text-amber-200 flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span><strong>Needs Review:</strong> {sug.consensus_detail || 'Models disagreed on tier classification.'}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-blue-300">{sug.gap_addressed}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onToggleStatus(sug.id, isAccepted ? 'pending' : 'accepted')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                          isAccepted
                            ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {isAccepted ? 'Accepted' : 'Accept Rewrite'}
                      </button>
                    </div>
                  </div>

                  {/* Diff Box */}
                  <div className="space-y-2 text-xs font-mono rounded-xl bg-slate-950 p-4 border border-gray-800">
                    <div className="text-rose-400/80 line-through">
                      - {sug.original_bullet}
                    </div>
                    <div className="text-emerald-400 font-semibold flex items-start gap-1">
                      <span className="text-emerald-500">+</span>
                      <span>{sug.suggested_text}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 mt-2 font-sans italic">
                    Why: {sug.why}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TIER 2: ADD BULLET (UNVERIFIED CONFIRMATION REQUIRED) */}
      {tier2.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Tier 2 — Add Bullet (Requires Explicit Confirmation)
            </h4>
            <span className="text-[10px] text-amber-300/80 font-mono">
              UNVERIFIED — Excluded from export until confirmed
            </span>
          </div>

          <div className="space-y-3">
            {tier2.map((sug) => {
              const isConfirmed = sug.status === 'confirmed';
              return (
                <div
                  key={sug.id}
                  className={`rounded-2xl border p-5 transition-all ${
                    sug.needs_review
                      ? 'border-amber-500/60 bg-amber-950/30 ring-1 ring-amber-500/40'
                      : isConfirmed
                      ? 'border-amber-500/50 bg-amber-950/20'
                      : 'border-amber-500/20 bg-slate-900/90'
                  }`}
                >
                  {/* Needs Review Badge */}
                  {sug.needs_review && (
                    <div className="mb-3 rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-[11px] text-amber-200 flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span><strong>Needs Review:</strong> {sug.consensus_detail || 'Models disagreed on tier classification.'}</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1">
                        UNVERIFIED — Confirm this is true
                      </span>
                      <h5 className="text-xs font-semibold text-white">{sug.gap_addressed}</h5>
                    </div>

                    <label className="flex items-center space-x-2 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-xl border border-amber-500/30 hover:border-amber-500">
                      <input
                        type="checkbox"
                        checked={isConfirmed}
                        onChange={(e) =>
                          onToggleStatus(sug.id, e.target.checked ? 'confirmed' : 'pending')
                        }
                        className="h-4 w-4 rounded border-gray-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-xs font-bold text-amber-300">
                        {isConfirmed ? 'Verified & Included' : 'Confirm Truth to Include'}
                      </span>
                    </label>
                  </div>

                  <div className="text-xs font-mono text-amber-200 bg-slate-950 p-4 rounded-xl border border-gray-800">
                    + {sug.suggested_text}
                  </div>

                  <p className="text-[11px] text-gray-400 mt-2 font-sans">
                    Why: {sug.why}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TIER 3: FLAG ONLY (NO BULLET GENERATED) */}
      {tier3.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Tier 3 — Flag Only (Unmet Requirement Warnings)
            </h4>
            <span className="text-[10px] text-rose-400 font-mono">No fake bullet created</span>
          </div>

          <div className="space-y-3">
            {tier3.map((sug) => (
              <div
                key={sug.id}
                className={`rounded-2xl border p-4 space-y-1 ${
                  sug.needs_review
                    ? 'border-amber-500/50 bg-amber-950/20 ring-1 ring-amber-500/30'
                    : 'border-rose-500/30 bg-rose-950/10'
                }`}
              >
                {/* Needs Review Badge */}
                {sug.needs_review && (
                  <div className="mb-2 rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-[11px] text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span><strong>Needs Review:</strong> {sug.consensus_detail || 'Models disagreed on tier classification.'}</span>
                  </div>
                )}

                <div className="flex items-center space-x-2 text-xs font-bold text-rose-300">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>{sug.gap_addressed}</span>
                </div>
                <p className="text-xs text-gray-300 pl-6">
                  {sug.why}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
