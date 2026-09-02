'use client';

import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Clock, CheckCircle, Cpu } from 'lucide-react';
import { ReasoningStep } from '@/lib/engine/types';

interface ModelReasoningTraceProps {
  trace?: ReasoningStep[];
}

export const ModelReasoningTrace: React.FC<ModelReasoningTraceProps> = ({ trace }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!trace || trace.length === 0) return null;

  const totalDuration = trace.reduce((acc, step) => acc + (step.durationMs || 0), 0);

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-[#0c1017] p-3.5 sm:p-5 shadow-2xl space-y-3.5 sm:space-y-4 animate-fade-in">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none group gap-2"
      >
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Brain className="h-4 w-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-100 group-hover:text-blue-300 transition truncate">
              Model Reasoning &amp; Chain of Thought Log
            </h3>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate">
              {trace.length} evaluation stages completed in{' '}
              <span className="font-mono text-blue-400">{(totalDuration / 1000).toFixed(1)}s</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-xs text-zinc-400 group-hover:text-zinc-200 shrink-0">
          <span className="hidden sm:inline">{isOpen ? 'Collapse' : 'Expand'}</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {isOpen && (
        <div className="space-y-3 pt-2 border-t border-white/[0.06]">
          {trace.map((step, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-white/[0.06] bg-[#07090e] p-3 sm:p-4 space-y-2.5 transition hover:border-blue-500/30"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-xs">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-300">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-zinc-200 truncate">{step.phase}</span>
                </div>

                <div className="flex items-center space-x-2.5 text-[10px] sm:text-[11px] text-zinc-400 pl-7 sm:pl-0">
                  <div className="flex items-center space-x-1 font-mono text-zinc-300 truncate max-w-[150px] sm:max-w-none">
                    <Cpu className="h-3 w-3 text-purple-400 shrink-0" />
                    <span className="truncate">{step.model}</span>
                  </div>
                  <div className="flex items-center space-x-1 font-mono text-zinc-400 shrink-0">
                    <Clock className="h-3 w-3 text-zinc-500 shrink-0" />
                    <span>{(step.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              </div>

              {/* Thought commentary / reasoning body */}
              <div className="rounded-lg bg-zinc-950/80 p-2.5 sm:p-3 border border-white/[0.04]">
                <p className="text-xs text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap break-words">
                  {step.thoughts}
                </p>
              </div>

              {/* Key conclusions bullets */}
              {step.keyConclusions && step.keyConclusions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
                  {step.keyConclusions.map((conc, cIdx) => (
                    <div
                      key={cIdx}
                      className="flex items-center space-x-1.5 rounded-md bg-blue-950/40 border border-blue-500/20 px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] text-blue-200 break-words"
                    >
                      <CheckCircle className="h-3 w-3 text-blue-400 shrink-0" />
                      <span>{conc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
