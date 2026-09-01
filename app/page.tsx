'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AISettingsModal } from '@/components/AISettingsModal';
import { JDInputPanel, AnalyzePayload } from '@/components/JDInputPanel';
import { ScoreGauges } from '@/components/ScoreGauges';
import { TieredSuggestionsDiff } from '@/components/TieredSuggestionsDiff';
import { RecruiterInsightsCard } from '@/components/RecruiterInsightsCard';
import { ModelReasoningTrace } from '@/components/ModelReasoningTrace';
import { ParseabilityHarnessModal } from '@/components/ParseabilityHarnessModal';
import { MasterResumeEditor } from '@/components/MasterResumeEditor';
import { HistoryTrackerView } from '@/components/HistoryTrackerView';
import {
  AISettingConfig,
  MasterResume,
  JobApplicationRecord,
  TargetIndustry,
  TieredSuggestion,
  ParseabilityResult,
} from '@/lib/engine/types';
import { INITIAL_MASTER_RESUME } from '@/lib/seed/masterData';
import { Download, FileCheck, Sparkles, RefreshCw, Cpu, Key, ArrowRight } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'studio' | 'master' | 'history' | 'settings'>('studio');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isParseabilityOpen, setIsParseabilityOpen] = useState(false);

  // Core Data States
  const [aiSettings, setAiSettings] = useState<AISettingConfig>({
    provider: 'gemini',
    model: 'gemini-3.7-flash',
    modelParse: 'gemini-3.6-flash',
    modelReason: 'gemini-3.7-flash',
    apiKeys: { gemini: '', openai: '', anthropic: '' },
  });
  const [masterResume, setMasterResume] = useState<MasterResume>(INITIAL_MASTER_RESUME);
  const [applications, setApplications] = useState<JobApplicationRecord[]>([]);

  // Current Active Run State
  const [currentApp, setCurrentApp] = useState<JobApplicationRecord | null>(null);
  const [suggestions, setSuggestions] = useState<TieredSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [parseabilityResult, setParseabilityResult] = useState<ParseabilityResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Load initial data on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.provider) setAiSettings(data);
      })
      .catch((err) => console.error('Failed to load settings:', err));

    fetch('/api/master-resume')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.contact_block) setMasterResume(data);
      })
      .catch((err) => console.error('Failed to load master resume:', err));

    fetch('/api/applications')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setApplications(data);
      })
      .catch((err) => console.error('Failed to load applications:', err));
  }, []);

  // Save AI Settings
  const handleSaveSettings = async (newSettings: AISettingConfig) => {
    setAiSettings(newSettings);
    setAnalysisError(null);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
    } catch (err) {
      console.error('Failed to save settings to API:', err);
    }
  };

  // Run ATS Analysis
  const handleAnalyze = async (payload: AnalyzePayload) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete ATS analysis');
      }
      if (data.success && data.appRecord) {
        setCurrentApp(data.appRecord);
        setSuggestions(data.appRecord.suggestions || []);
        // Refresh past applications
        setApplications((prev) => [data.appRecord, ...prev]);
      }
    } catch (err: any) {
      console.error('Error running ATS analysis:', err);
      setAnalysisError(err?.message || 'Error occurred during ATS analysis. Please retry or switch AI models.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle suggestion status toggle (accept, reject, confirm unverified)
  const handleToggleSuggestionStatus = (
    id: string,
    newStatus: 'accepted' | 'rejected' | 'confirmed' | 'pending'
  ) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
  };

  // Run Parseability Harness and open inspection modal
  const handleInspectParseability = async () => {
    if (!currentApp) return;
    setIsExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: currentApp.id,
          industry: currentApp.industry,
          acceptedSuggestions: suggestions,
          resume: lensedResume || masterResume,
          format: 'docx',
        }),
      });
      const data = await res.json();
      if (data.success && data.parseability) {
        setParseabilityResult(data.parseability);
        setIsParseabilityOpen(true);
      }
    } catch (err) {
      console.error('Error running parseability harness:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Trigger DOCX File Download
  const handleDownloadDocx = async () => {
    if (!currentApp) return;
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: currentApp.id,
          industry: currentApp.industry,
          acceptedSuggestions: suggestions,
          resume: lensedResume || masterResume,
          format: 'docx',
        }),
      });
      const data = await res.json();
      if (data.success && data.base64) {
        const byteCharacters = atob(data.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const candidateName = (lensedResume || masterResume).contact_block?.name?.replace(/\s+/g, '_') || 'Resume';
        a.download = data.filename || `${candidateName}_${currentApp.industry}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error downloading DOCX:', err);
    }
  };

  // Trigger Plain Text Download
  const handleDownloadTxt = async () => {
    if (!currentApp) return;
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: currentApp.id,
          industry: currentApp.industry,
          acceptedSuggestions: suggestions,
          resume: lensedResume || masterResume,
          format: 'txt',
        }),
      });
      const data = await res.json();
      if (data.success && data.text) {
        const blob = new Blob([data.text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const candidateName = (lensedResume || masterResume).contact_block?.name?.replace(/\s+/g, '_') || 'Resume';
        a.download = `${candidateName}_${currentApp.industry}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error downloading TXT:', err);
    }
  };

  // Update Master Resume
  const handleSaveMasterResume = async (updated: MasterResume) => {
    setMasterResume(updated);
    await fetch('/api/master-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
  };

  // Reset Master Resume
  const handleResetMasterResume = async () => {
    setMasterResume(INITIAL_MASTER_RESUME);
    await fetch('/api/master-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reset: true }),
    });
  };

  // Update Screening Outcome
  const handleUpdateOutcome = async (
    id: string,
    outcome: 'passed_ats' | 'rejected_ats' | 'interview_scheduled' | 'no_response' | 'pending'
  ) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, screening_outcome: outcome } : app))
    );
    await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, screening_outcome: outcome }),
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white">
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        aiSettings={aiSettings}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 space-y-8">
        {activeTab === 'studio' && (
          <div className="space-y-8">
            {/* Error Notification Alert & 1-Click Fallback Switches */}
            {analysisError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-rose-200 text-xs shadow-lg animate-fade-in space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                    <span className="font-medium">{analysisError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="rounded-lg bg-rose-900/80 hover:bg-rose-850 px-3 py-1.5 font-medium text-rose-100 border border-rose-400/20 transition text-xs whitespace-nowrap"
                  >
                    All Models...
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-500/20 text-[11px]">
                  <span className="text-zinc-400">1-Click Quick Retry:</span>
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveSettings({
                        ...aiSettings,
                        provider: 'groq',
                        model: 'qwen/qwen3.8-27b',
                        modelParse: 'qwen/qwen3.8-27b',
                        modelReason: 'groq/compound-mini',
                      });
                    }}
                    className="rounded-md bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 text-orange-300 border border-orange-500/30 transition active:scale-95 font-medium"
                  >
                    ⚡ Groq Qwen 3.8 (Ultra-Fast)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveSettings({
                        ...aiSettings,
                        provider: 'nvidia',
                        model: 'meta/llama-3.2-90b-vision-instruct',
                        modelParse: 'meta/llama-3.2-11b-vision-instruct',
                        modelReason: 'meta/llama-3.2-90b-vision-instruct',
                      });
                    }}
                    className="rounded-md bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 text-emerald-300 border border-emerald-500/30 transition active:scale-95 font-medium"
                  >
                    🟢 NVIDIA Llama 3.2 90B
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveSettings({
                        ...aiSettings,
                        provider: 'nvidia',
                        model: 'minimaxai/minimax-m3',
                        modelParse: 'minimaxai/minimax-m3',
                        modelReason: 'minimaxai/minimax-m3',
                      });
                    }}
                    className="rounded-md bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 text-blue-300 border border-blue-500/30 transition active:scale-95 font-medium"
                  >
                    🔵 MiniMax M3
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveSettings({
                        ...aiSettings,
                        provider: 'nvidia',
                        model: 'google/gemma-4-31b-it',
                        modelParse: 'google/gemma-4-31b-it',
                        modelReason: 'google/gemma-4-31b-it',
                      });
                    }}
                    className="rounded-md bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 text-purple-300 border border-purple-500/30 transition active:scale-95 font-medium"
                  >
                    🟣 Google Gemma 4 31B
                  </button>
                </div>
              </div>
            )}

            {/* Top Dual Input Studio (JD + Candidate Resume Source) */}
            <JDInputPanel
              onAnalyze={handleAnalyze}
              isLoading={isAnalyzing}
              masterResume={masterResume}
              aiSettings={aiSettings}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />

            {/* Analysis Results Section */}
            {currentApp ? (
              <div className="space-y-6 animate-fade-in">
                {/* 🧠 Live Model Reasoning & Chain of Thought Trace */}
                <ModelReasoningTrace trace={currentApp.reasoning_trace} />

                {/* 3 Pass Score Gauges & Breakdown */}
                <ScoreGauges scores={currentApp.scores} parsedJD={currentApp.parsed_jd} />

                {/* Interactive 3-Tier Suggestion Diff */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-6 shadow-2xl space-y-6">
                  <TieredSuggestionsDiff
                    suggestions={suggestions}
                    onToggleStatus={handleToggleSuggestionStatus}
                  />

                  {/* Parseability Harness & Export Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/[0.06]">
                    <div className="text-xs text-zinc-400">
                      Accepted rewrites:{' '}
                      <span className="font-mono font-bold text-emerald-400">
                        {suggestions.filter((s) => s.status === 'accepted').length}
                      </span>{' '}
                      • Confirmed additions:{' '}
                      <span className="font-mono font-bold text-amber-400">
                        {suggestions.filter((s) => s.status === 'confirmed').length}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleInspectParseability}
                        disabled={isExporting}
                        className="flex items-center space-x-1.5 rounded-xl border border-white/[0.08] bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white hover:border-zinc-700 active:scale-[0.98]"
                      >
                        <FileCheck className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Inspect Parseability</span>
                      </button>

                      <button
                        onClick={handleDownloadDocx}
                        className="flex items-center space-x-1.5 rounded-xl bg-zinc-100 px-5 py-2 text-xs font-semibold text-zinc-900 transition-all hover:bg-white hover:shadow-lg active:scale-[0.98]"
                      >
                        <Download className="h-3.5 w-3.5 text-zinc-900" />
                        <span>Export Word (.docx)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Unconstrained Strategic Recruiter Insights & Advice */}
                <RecruiterInsightsCard insights={currentApp.recruiter_insights} />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-800/80 bg-[#111114]/40 p-12 text-center space-y-3">
                <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mx-auto text-zinc-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200">Ready for ATS Matching</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Provide a Job Description and choose a resume source above, then click &quot;Run ATS Match &amp; Gap Engine&quot; to inspect 3-pass scoring and recruiter rewrites.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'master' && (
          <MasterResumeEditor
            masterResume={masterResume}
            onSave={handleSaveMasterResume}
            onReset={handleResetMasterResume}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTrackerView
            applications={applications}
            onUpdateOutcome={handleUpdateOutcome}
          />
        )}
      </main>

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={aiSettings}
        onSave={handleSaveSettings}
      />

      {/* Parseability Harness Inspector Modal */}
      <ParseabilityHarnessModal
        isOpen={isParseabilityOpen}
        onClose={() => setIsParseabilityOpen(false)}
        result={parseabilityResult}
        industry={currentApp?.industry || 'AI Platforms'}
        onDownloadDocx={handleDownloadDocx}
        onDownloadTxt={handleDownloadTxt}
      />
    </div>
  );
}
