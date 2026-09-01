'use client';

import React from 'react';
import { Sparkles, Compass, MessageSquare, Briefcase, AlertTriangle, Lightbulb } from 'lucide-react';
import { RecruiterInsights } from '@/lib/engine/types';

interface RecruiterInsightsCardProps {
  insights?: RecruiterInsights;
}

export const RecruiterInsightsCard: React.FC<RecruiterInsightsCardProps> = ({ insights }) => {
  if (!insights) return null;

  const hasContent =
    insights.positioning_strategy ||
    (insights.interview_talking_points && insights.interview_talking_points.length > 0) ||
    (insights.portfolio_and_project_focus && insights.portfolio_and_project_focus.length > 0) ||
    (insights.risk_factors_or_gotchas && insights.risk_factors_or_gotchas.length > 0) ||
    insights.additional_notes;

  if (!hasContent) return null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-6 shadow-2xl space-y-5 animate-fade-in">
      <div className="flex items-center space-x-2 border-b border-white/[0.06] pb-3">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-zinc-100">
          Executive Recruiter Strategy & Candid Observations
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Positioning Strategy */}
        {insights.positioning_strategy && (
          <div className="rounded-xl border border-white/[0.06] bg-[#09090b] p-4 space-y-2 md:col-span-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200">
              <Compass className="h-3.5 w-3.5 text-blue-400" />
              <span>Target Role Positioning Strategy</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              {insights.positioning_strategy}
            </p>
          </div>
        )}

        {/* Interview Talking Points */}
        {insights.interview_talking_points && insights.interview_talking_points.length > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-[#09090b] p-4 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200">
              <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
              <span>High-Impact Interview Talking Points</span>
            </div>
            <ul className="space-y-1.5 text-xs text-zinc-300 list-disc list-inside">
              {insights.interview_talking_points.map((point, idx) => (
                <li key={idx} className="leading-relaxed">
                  <span className="text-zinc-200">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Portfolio & Project Focus */}
        {insights.portfolio_and_project_focus && insights.portfolio_and_project_focus.length > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-[#09090b] p-4 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200">
              <Briefcase className="h-3.5 w-3.5 text-purple-400" />
              <span>Portfolio & Artifact Focus</span>
            </div>
            <ul className="space-y-1.5 text-xs text-zinc-300 list-disc list-inside">
              {insights.portfolio_and_project_focus.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  <span className="text-zinc-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risk Factors or Gotchas */}
        {insights.risk_factors_or_gotchas && insights.risk_factors_or_gotchas.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span>Strategic Questions & Preemptive Angles</span>
            </div>
            <ul className="space-y-1.5 text-xs text-amber-200/90 list-disc list-inside">
              {insights.risk_factors_or_gotchas.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Unconstrained Recruiter Notes */}
        {insights.additional_notes && (
          <div className="rounded-xl border border-white/[0.06] bg-[#09090b] p-4 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200">
              <Lightbulb className="h-3.5 w-3.5 text-yellow-400" />
              <span>Executive Advisory Commentary</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              {insights.additional_notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
