'use client';

import React from 'react';
import { Target, CheckCircle2, AlertTriangle, ShieldCheck, Award, FileCode } from 'lucide-react';
import { ScoreBreakdown, ParsedJD } from '@/lib/engine/types';

interface ScoreGaugesProps {
  scores: ScoreBreakdown;
  parsedJD: ParsedJD;
}

export const ScoreGauges: React.FC<ScoreGaugesProps> = ({ scores, parsedJD }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.06]';
    if (score >= 60) return 'text-amber-400 border-amber-500/20 bg-amber-500/[0.06]';
    return 'text-rose-400 border-rose-500/20 bg-rose-500/[0.06]';
  };

  const getMeterColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-400';
    if (score >= 60) return 'bg-amber-400';
    return 'bg-rose-400';
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Composite Score & Target Role */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 rounded-2xl border border-white/[0.08] bg-[#111114] p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <Award className="h-3.5 w-3.5 text-zinc-300" />
            <span>Target Role Alignment</span>
          </div>
          <h2 className="text-lg font-bold text-zinc-100 tracking-tight">{parsedJD.title}</h2>
          <p className="text-xs text-zinc-400">
            {parsedJD.company !== 'Unknown' ? parsedJD.company : 'Target Employer'} • Seniority:{' '}
            <span className="text-zinc-200 font-medium">{parsedJD.seniority_level}</span>
          </p>
        </div>

        {/* Composite Score Pill Gauge */}
        <div className="flex items-center space-x-4 border-t md:border-t-0 md:border-l border-white/[0.08] pt-3 md:pt-0 md:pl-6 w-full md:w-auto justify-between md:justify-start">
          <div className={`flex h-16 w-16 flex-col items-center justify-center rounded-xl border ${getScoreColor(scores.composite_score)} font-mono shadow-sm`}>
            <span className="text-xl font-bold tracking-tight">{scores.composite_score}%</span>
            <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-sans">Match</span>
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-200">Overall ATS Score</div>
            <p className="text-[11px] text-zinc-400 max-w-[190px] leading-tight mt-0.5">
              50% Hard Keywords + 35% Semantic + 15% Parseability
            </p>
          </div>
        </div>
      </div>

      {/* 3 Pass Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pass A: Hard Keywords */}
        <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-4 space-y-3 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-zinc-400" />
              Hard-Match Keywords
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${getScoreColor(scores.hard_match_score)}`}>
              {scores.hard_match_score}%
            </span>
          </div>

          <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-white/[0.06]">
            <div
              className={`h-full ${getMeterColor(scores.hard_match_score)} transition-all duration-300`}
              style={{ width: `${scores.hard_match_score}%` }}
            />
          </div>

          <div className="text-xs text-zinc-400 space-y-2">
            <div className="flex justify-between text-[11px]">
              <span>Matched Keywords:</span>
              <span className="font-mono font-semibold text-emerald-400">{scores.matched_keywords.length}</span>
            </div>
            {scores.missing_required_keywords.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-rose-400 font-medium block">Missing Required:</span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {scores.missing_required_keywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-1.5 py-0.5 text-[10px] bg-rose-500/[0.08] border border-rose-500/20 text-rose-300 rounded font-mono"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pass B: Semantic Relevance */}
        <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-4 space-y-3 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-zinc-400" />
              Semantic Coverage
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${getScoreColor(scores.semantic_score)}`}>
              {scores.semantic_score}%
            </span>
          </div>

          <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-white/[0.06]">
            <div
              className={`h-full ${getMeterColor(scores.semantic_score)} transition-all duration-300`}
              style={{ width: `${scores.semantic_score}%` }}
            />
          </div>

          <div className="text-[11px] text-zinc-400 space-y-1.5">
            <div className="flex justify-between">
              <span>Evidenced Duties:</span>
              <span className="font-mono font-semibold text-zinc-200">
                {scores.responsibility_coverage.filter((r) => r.is_covered).length} / {scores.responsibility_coverage.length}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Assesses recruiter-level narrative alignment across key JD responsibilities.
            </p>
          </div>
        </div>

        {/* Pass C: Formatting & ATS Parseability */}
        <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-4 space-y-3 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <FileCode className="h-3.5 w-3.5 text-zinc-400" />
              ATS Structure
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${getScoreColor(scores.formatting_score)}`}>
              {scores.formatting_score}%
            </span>
          </div>

          <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-white/[0.06]">
            <div
              className={`h-full ${getMeterColor(scores.formatting_score)} transition-all duration-300`}
              style={{ width: `${scores.formatting_score}%` }}
            />
          </div>

          <div className="text-[11px] text-zinc-400">
            {scores.formatting_hazards.length === 0 ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Clean Parseability
              </span>
            ) : (
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {scores.formatting_hazards.map((h, i) => (
                  <div key={i} className="text-[10px] text-amber-400 flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-amber-400" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
