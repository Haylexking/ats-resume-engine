'use client';

import React from 'react';
import { History, Award, CheckCircle2, XCircle, Calendar, ArrowUpRight, ShieldCheck, AlertTriangle, FileCode } from 'lucide-react';
import { JobApplicationRecord, ScreeningOutcome } from '@/lib/engine/types';

interface HistoryTrackerViewProps {
  applications: JobApplicationRecord[];
  onUpdateOutcome: (
    id: string,
    outcome: ScreeningOutcome
  ) => void;
}

export const HistoryTrackerView: React.FC<HistoryTrackerViewProps> = ({
  applications,
  onUpdateOutcome,
}) => {
  if (applications.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-slate-900/90 p-12 text-center space-y-3">
        <History className="h-10 w-10 text-gray-600 mx-auto" />
        <h3 className="text-base font-bold text-white">No Job Description Runs Saved Yet</h3>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          Run your first ATS match analysis from the ATS Matcher Studio tab to start logging application scores and screening outcomes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-gray-800 bg-slate-900/90 p-5 shadow-xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-blue-400" />
            Application Runs & Real-World Screening Outcomes
          </h2>
          <p className="text-xs text-gray-400">
            Log screening outcomes per JD run to calibrate ATS keyword weightings and parseability checks against actual Workday / Greenhouse results.
          </p>
        </div>
        <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 whitespace-nowrap self-start sm:self-auto">
          {applications.length} Saved Run{applications.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-4">
        {applications.map((app) => {
          const diffCount = (app.parseability_diff || []).length;
          return (
            <div key={app.id} className="rounded-2xl border border-gray-800 bg-slate-900/80 p-6 space-y-4 shadow-lg hover:border-gray-700 transition">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {app.industry}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      {new Date(app.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">{app.job_title}</h3>
                  <p className="text-xs text-gray-400">{app.company}</p>
                </div>

                {/* Match Score Gauge & Status Selector */}
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-gray-400">Composite Match</div>
                    <div className="text-xl font-extrabold text-blue-400">
                      {app.scores.composite_score}%
                    </div>
                  </div>

                  {/* Screening Outcome Selector */}
                  <div>
                    <select
                      value={app.screening_outcome || 'pending'}
                      onChange={(e) => onUpdateOutcome(app.id, e.target.value as any)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold focus:outline-none transition ${
                        app.screening_outcome === 'interview_scheduled'
                          ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                          : app.screening_outcome === 'passed_ats'
                          ? 'border-blue-500/40 bg-blue-950/40 text-blue-300'
                          : app.screening_outcome === 'rejected_ats'
                          ? 'border-rose-500/40 bg-rose-950/40 text-rose-300'
                          : app.screening_outcome === 'no_response'
                          ? 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                          : 'border-gray-800 bg-slate-950 text-gray-300'
                      }`}
                    >
                      <option value="pending">⏳ Pending Result</option>
                      <option value="passed_ats">✅ Screened / Passed ATS</option>
                      <option value="interview_scheduled">🎉 Interview Scheduled</option>
                      <option value="rejected_ats">❌ Rejected ATS Screen</option>
                      <option value="no_response">📭 No Response</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Score Pass breakdown */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-800 text-xs font-mono text-gray-300">
                <div className="bg-slate-950/50 p-2 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 block text-[10px]">Hard Match (50%):</span>
                  <span className="font-bold text-white text-sm">{app.scores.hard_match_score}%</span>
                </div>
                <div className="bg-slate-950/50 p-2 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 block text-[10px]">Semantic (35%):</span>
                  <span className="font-bold text-white text-sm">{app.scores.semantic_score}%</span>
                </div>
                <div className="bg-slate-950/50 p-2 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 block text-[10px]">ATS Structure (15%):</span>
                  <span className="font-bold text-white text-sm">{app.scores.formatting_score}%</span>
                </div>
              </div>

              {/* Parseability & Prompt Version Metadata Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-800/60 text-[11px] text-gray-400 font-mono">
                <div className="flex items-center gap-2">
                  {diffCount === 0 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <ShieldCheck className="h-3 w-3" />
                      ATS Parseability: Clean Ingestion
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <AlertTriangle className="h-3 w-3" />
                      ATS Parseability: {diffCount} Warning{diffCount === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                {app.prompt_versions && (
                  <div className="flex items-center gap-1.5 text-gray-500 text-[10px]">
                    <FileCode className="h-3 w-3 text-gray-400" />
                    <span>Prompts: {app.prompt_versions.parse} | {app.prompt_versions.recommend}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
