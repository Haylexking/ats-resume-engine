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
    <div className="rounded-2xl border border-blue-500/20 bg-[#0c1017] p-5 shadow-2xl space-y-4 animate-fade-in">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none group"
      >
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Brain className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-blue-300 transition">
              Model Reasoning &amp; Chain of Thought Log
            </h3>
            <p className="text-[11px] text-zinc-400">
              {trace.length} evaluation stages completed in{' '}
              <span className="font-mono text-blue-400">{(totalDuration / 1000).toFixed(1)}s</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-zinc-400 group-hover:text-zinc-200">
          <span>{isOpen ? 'Collapse' : 'Expand'}</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {isOpen && (
        <div className="space-y-3 pt-2 border-t border-white/[0.06]">
          {trace.map((step, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-white/[0.06] bg-[#07090e] p-4 space-y-2.5 transition hover:border-blue-500/30"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-300">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-zinc-200">{step.phase}</span>
                </div>

                <div className="flex items-center space-x-3 text-[11px] text-zinc-400">
                  <div className="flex items-center space-x-1 font-mono text-zinc-300">
                    <Cpu className="h-3 w-3 text-purple-400" />
                    <span>{step.model}</span>
                  </div>
                  <div className="flex items-center space-x-1 font-mono text-zinc-400">
                    <Clock className="h-3 w-3 text-zinc-500" />
                    <span>{(step.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              </div>

              {/* Thought commentary / reasoning body */}
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-white/[0.04]">
                <p className="text-xs text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">
                  {step.thoughts}
                </p>
              </div>

              {/* Key conclusions bullets */}
              {step.keyConclusions && step.keyConclusions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {step.keyConclusions.map((conc, cIdx) => (
                    <div
                      key={cIdx}
                      className="flex items-center space-x-1.5 rounded-md bg-blue-950/40 border border-blue-500/20 px-2.5 py-1 text-[11px] text-blue-200"
                    >
                      <CheckCircle className="h-3 w-3 text-blue-400" />
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
