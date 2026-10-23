'use client';

import React from 'react';
import { Target, Settings, Sparkles, History } from 'lucide-react';
import { AISettingConfig } from '@/lib/engine/types';

interface HeaderProps {
  activeTab: 'studio' | 'tailored' | 'history' | 'settings';
  setActiveTab: (tab: 'studio' | 'tailored' | 'history' | 'settings') => void;
  aiSettings: AISettingConfig;
  onOpenSettings: () => void;
  hasTailoredResume?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  aiSettings,
  onOpenSettings,
  hasTailoredResume,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#09090b]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6 sm:py-2.5 gap-2">
        {/* Brand */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 border border-white/[0.1] text-zinc-100 shadow-sm">
            <Target className="h-4 w-4 text-zinc-200" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-zinc-100 truncate">
                Personal ATS
              </h1>
              <span className="hidden md:inline-flex shrink-0 rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[9px] font-mono font-medium text-zinc-400 border border-white/[0.06]">
                Frontier Studio
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 rounded-xl bg-zinc-900/90 p-1 border border-white/[0.08] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 font-medium transition-all ${
              activeTab === 'studio'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Target className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">ATS Analysis</span>
            <span className="sm:hidden">Match</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tailored')}
            className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 font-medium transition-all ${
              activeTab === 'tailored'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span className="hidden sm:inline">Tailored CV Studio</span>
            <span className="sm:hidden">Tailor CV</span>
            {hasTailoredResume && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="h-3.5 w-3.5 shrink-0" />
            <span>History</span>
          </button>
        </nav>

        {/* Model Status Pill & Settings */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 sm:space-x-2 rounded-lg border border-white/[0.08] bg-zinc-900/90 px-2 sm:px-2.5 py-1.5 text-xs text-zinc-300 transition-all hover:bg-zinc-800 hover:border-zinc-700 active:scale-[0.98]"
            title="Configure AI Models"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <span className="font-medium text-zinc-200 capitalize text-xs">{aiSettings.provider}</span>
            <span className="text-zinc-500 font-mono text-[10px] hidden lg:inline truncate max-w-[100px]">
              {aiSettings.modelReason || aiSettings.model}
            </span>
          </button>

          <button
            type="button"
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
