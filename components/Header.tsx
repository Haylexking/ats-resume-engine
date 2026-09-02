'use client';

import React from 'react';
import { Target, Settings } from 'lucide-react';
import { AISettingConfig } from '@/lib/engine/types';

interface HeaderProps {
  activeTab: 'studio' | 'history' | 'settings';
  setActiveTab: (tab: 'studio' | 'history' | 'settings') => void;
  aiSettings: AISettingConfig;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  aiSettings,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#09090b]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3 gap-2">
        {/* Brand */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 border border-white/[0.1] text-zinc-100 shadow-sm">
            <Target className="h-4 w-4 text-zinc-200" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-zinc-100 truncate">
                Personal ATS Studio
              </h1>
              <span className="shrink-0 rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono font-medium text-zinc-400 border border-white/[0.06]">
                3-Tier Matcher
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 tracking-tight hidden sm:block truncate">
              Recruiter-Reasoned Gap Engine &amp; ATS Parseability Harness
            </p>
          </div>
        </div>

        {/* Model Status Pill & Settings */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 sm:space-x-2 rounded-lg border border-white/[0.08] bg-zinc-900/90 px-2 sm:px-3 py-1.5 text-xs text-zinc-300 transition-all hover:bg-zinc-800 hover:border-zinc-700 active:scale-[0.98]"
            title="Configure AI Models"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <span className="font-medium text-zinc-200 capitalize text-xs">{aiSettings.provider}</span>
            <span className="text-zinc-500 font-mono text-[10px] hidden md:inline truncate max-w-[120px]">
              {aiSettings.modelReason || aiSettings.model}
            </span>
          </button>

          <button
            onClick={onOpenSettings}
            className="rounded-lg border border-white/[0.08] bg-zinc-900/90 p-1.5 sm:p-2 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200 active:scale-[0.98]"
            title="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
