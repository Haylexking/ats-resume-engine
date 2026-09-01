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
import { HistoryTrackerView } from '@/components/HistoryTrackerView';
import {
  AISettingConfig,
  MasterResume,
  JobApplicationRecord,
  TieredSuggestion,
  ParseabilityResult,
} from '@/lib/engine/types';
import { Download, FileCheck, Sparkles, RefreshCw, Cpu, Key, ArrowRight } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'studio' | 'history' | 'settings'>('studio');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isParseabilityOpen, setIsParseabilityOpen] = useState(false);

  // Core Data States
  const [aiSettings, setAiSettings] = useState<AISettingConfig>({
    provider: 'groq',
    model: 'groq/compound-mini',
    modelParse: 'qwen/qwen3.8-27b',
    modelReason: 'groq/compound-mini',
    apiKeys: { groq: '', nvidia: '', gemini: '', openai: '', anthropic: '' },
  });
  const [applications, setApplications] = useState<JobApplicationRecord[]>([]);

  // Current Active Run State
  const [currentApp, setCurrentApp] = useState<JobApplicationRecord | null>(null);
  const [activeResume, setActiveResume] = useState<MasterResume | null>(null);
  const [suggestions, setSuggestions] = useState<TieredSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [parseabilityResult, setParseabilityResult] = useState<ParseabilityResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Load initial settings and history on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.provider) setAiSettings(data);
      })
      .catch((err) => console.error('Failed to load settings:', err));

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
        body: JSON.stringify({
          ...payload,
          aiSettings,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete ATS analysis');
      }
      if (data.success && data.appRecord) {
        setCurrentApp(data.appRecord);
        setActiveResume(data.lensedResume);
        setSuggestions(data.appRecord.suggestions || []);
        setApplications((prev) => [data.appRecord, ...prev]);
      }
    } catch (err: any) {
      console.error('Error running ATS analysis:', err);
      setAnalysisError(err?.message || 'Error occurred during ATS analysis. Please retry or switch AI models.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle suggestion status toggle
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
    if (!currentApp || !activeResume) return;
    setIsExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: currentApp.id,
          industry: currentApp.industry,
          acceptedSuggestions: suggestions,
          resume: activeResume,
          format: 'docx',
        }),
      });
      const data = await res.json();
      if (data.success && data.parseability) {
        setParseabilityResult(data.parseability);
        setIsParseabilityOpen(true);
      } else {
        alert(data.error || 'Failed to extract parseability text');
      }
    } catch (err: any) {
      console.error('Error inspecting parseability:', err);
      alert('Error running parseability harness: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Download Tailored ATS-Compliant DOCX
  const handleDownloadDocx = async () => {
    if (!currentApp || !activeResume) return;
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: currentApp.id,
          industry: currentApp.industry,
          acceptedSuggestions: suggestions,
          resume: activeResume,
          format: 'docx',
        }),
      });
      const data = await res.json();
      if (data.success && data.docxBase64) {
        const byteCharacters = atob(data.docxBase64);
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
        const candidateName = activeResume.contact_block.name.replace(/\s+/g, '_') || 'Resume';
        const roleName = currentApp.job_title.replace(/[^a-zA-Z0-9]/g, '_') || 'Tailored';
        a.download = `${candidateName}_${roleName}_ATS.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Error generating DOCX: ' + err.message);
    }
  };

  // Download Plain Text (.txt)
  const handleDownloadTxt = async () => {
    if (!currentApp || !activeResume) return;
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: currentApp.id,
          industry: currentApp.industry,
          acceptedSuggestions: suggestions,
          resume: activeResume,
          format: 'txt',
        }),
      });
      const data = await res.json();
      if (data.success && data.txt) {
        const blob = new Blob([data.txt], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const candidateName = activeResume.contact_block.name.replace(/\s+/g, '_') || 'Resume';
        const roleName = currentApp.job_title.replace(/[^a-zA-Z0-9]/g, '_') || 'Tailored';
        a.download = `${candidateName}_${roleName}_ATS.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Error generating TXT: ' + err.message);
    }
  };

  // Handle Application Outcome Update
  const handleOutcomeChange = async (
    appId: string,
    outcome: 'pending' | 'callback' | 'interview' | 'rejection' | 'offer'
  ) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, outcome }),
      });
      const data = await res.json();
      if (data.success) {
        setApplications((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, screening_outcome: outcome } : a))
        );
        if (currentApp?.id === appId) {
          setCurrentApp((prev) => (prev ? { ...prev, screening_outcome: outcome } : null));
        }
      }
    } catch (err) {
      console.error('Error updating outcome:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-zinc-100">
      {/* Top Header */}
      <Header
        activeTab={activeTab as any}
        setActiveTab={(tab: any) => setActiveTab(tab)}
        aiSettings={aiSettings}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {activeTab === 'studio' && (
          <div className="space-y-6">
            {/* Error Notification Banner with Instant 1-Click Model Switch */}
            {analysisError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-300 animate-fade-in shadow-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2.5">
                    <div className="h-2 w-2 rounded-full bg-rose-400 mt-1 flex-shrink-0 animate-ping" />
                    <div>
                      <span className="font-semibold text-rose-200">Analysis Halted:</span>
                      <p className="mt-0.5 text-rose-300 font-mono text-[11px] leading-relaxed">
                        {analysisError}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnalysisError(null)}
                    className="text-rose-400 hover:text-rose-200 text-xs ml-4"
                  >
                    Dismiss
                  </button>
                </div>

                {/* 1-Click Switch Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-500/20 text-[11px]">
                  <span className="text-zinc-400 font-medium">Switch to another model:</span>
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveSettings({
                        ...aiSettings,
                        provider: 'groq',
                        model: 'groq/compound-mini',
                        modelParse: 'qwen/qwen3.8-27b',
                        modelReason: 'groq/compound-mini',
                      });
                    }}
                    className="rounded-md bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 text-emerald-300 border border-emerald-500/30 transition active:scale-95 font-medium"
                  >
                    ⚡ Groq Compound Mini
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
                    🟢 NVIDIA Llama 90B
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
                </div>
              </div>
            )}

            {/* Top Universal Dual Input Studio (JD + Candidate Resume) */}
            <JDInputPanel
              onAnalyze={handleAnalyze}
              isLoading={isAnalyzing}
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

                      <button
                        onClick={handleDownloadTxt}
                        className="flex items-center space-x-1.5 rounded-xl border border-white/[0.08] bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white active:scale-[0.98]"
                      >
                        <Download className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Plain Text (.txt)</span>
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
                  Paste any target Job Description and upload or paste candidate resume text above, then click &quot;Run ATS Match &amp; Gap Engine&quot; to inspect 3-pass scoring and recruiter rewrites.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryTrackerView
            applications={applications}
            onUpdateOutcome={handleOutcomeChange}
          />
        )}
      </main>

      {/* Footer & Copyright */}
      <footer className="w-full border-t border-white/[0.06] bg-[#07090e] py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-center">
          <span>© 2026 Built by <strong className="text-zinc-300 font-semibold">Alexander Akerele</strong></span>
        </div>
      </footer>

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={aiSettings}
        onSave={handleSaveSettings}
      />

      {/* Parseability Harness Modal */}
      {parseabilityResult && (
        <ParseabilityHarnessModal
          isOpen={isParseabilityOpen}
          onClose={() => setIsParseabilityOpen(false)}
          result={parseabilityResult}
          onDownloadDocx={handleDownloadDocx}
          onDownloadTxt={handleDownloadTxt}
        />
      )}
    </div>
  );
}
