'use client';

import React from 'react';
import { Target, FileText, History, Settings, Sparkles, Cpu, Layers } from 'lucide-react';
import { AISettingConfig } from '@/lib/engine/types';

interface HeaderProps {
  activeTab: 'studio' | 'master' | 'history' | 'settings';
  setActiveTab: (tab: 'studio' | 'master' | 'history' | 'settings') => void;
  aiSettings: AISettingConfig;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  aiSettings,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#09090b]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 border border-white/[0.1] text-zinc-100 shadow-sm">
            <Target className="h-4 w-4 text-zinc-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
                Personal ATS Studio
              </h1>
              <span className="rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-400 border border-white/[0.06]">
                3-Tier Matcher
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 tracking-tight">
              Recruiter-Reasoned Gap Engine & ATS Parseability Harness
            </p>
          </div>
        </div>

        {/* Segmented Navigation Bar */}
        <nav className="hidden md:flex items-center space-x-1 rounded-xl bg-zinc-900/80 p-1 border border-white/[0.06] shadow-inner">
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center space-x-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.98] ${
              activeTab === 'studio'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-white/[0.08]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
            <span>ATS Matcher Studio</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.98] ${
              activeTab === 'history'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-white/[0.08]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <History className="h-3.5 w-3.5 text-zinc-300" />
            <span>Applications &amp; Calibration</span>
          </button>
        </nav>

        {/* Model Status Pill & Settings */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-2 rounded-lg border border-white/[0.08] bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-300 transition-all hover:bg-zinc-800 hover:border-zinc-700 active:scale-[0.98]"
            title="Configure AI Models & Multi-Model Pipeline"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <span className="font-medium text-zinc-200 capitalize">{aiSettings.provider}</span>
            <span className="text-zinc-500 font-mono text-[10px]">
              {aiSettings.modelReason || aiSettings.model}
            </span>
          </button>

          <button
            onClick={onOpenSettings}
            className="rounded-lg border border-white/[0.08] bg-zinc-900/90 p-2 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200 active:scale-[0.98]"
            title="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
