'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Check, Eye, EyeOff, Sparkles, Cpu, Layers, Zap } from 'lucide-react';
import { AISettingConfig, AIProvider } from '@/lib/engine/types';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AISettingConfig;
  onSave: (newSettings: AISettingConfig) => void;
}

const MODEL_OPTIONS: Record<AIProvider, { id: string; name: string }[]> = {
  nvidia: [
    // Meta Llama Series
    { id: 'meta/llama-3.2-11b-vision-instruct', name: 'Meta Llama 3.2 11B Vision Instruct (Fast)' },
    { id: 'meta/llama-3.2-90b-vision-instruct', name: 'Meta Llama 3.2 90B Vision Instruct (Flagship)' },
    { id: 'meta/llama-3.3-70b-instruct', name: 'Meta Llama 3.3 70B Instruct' },
    { id: 'meta/llama-3.1-70b-instruct', name: 'Meta Llama 3.1 70B Instruct' },
    { id: 'meta/llama-3.1-8b-instruct', name: 'Meta Llama 3.1 8B Instruct' },
    { id: 'meta/llama-3.1-405b-instruct', name: 'Meta Llama 3.1 405B Instruct' },
    { id: 'meta/codellama-70b', name: 'Meta CodeLlama 70B' },
    { id: 'meta/llama2-70b', name: 'Meta Llama 2 70B' },
    { id: 'meta/llama-guard-4-12b', name: 'Meta Llama Guard 4 12B' },
    { id: 'meta/muse-glimmer-30b', name: 'Meta Muse Glimmer 30B' },

    // DeepSeek Series
    { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1 (Deep Reasoning)' },
    { id: 'deepseek-ai/deepseek-v3', name: 'DeepSeek V3' },
    { id: 'deepseek-ai/deepseek-v4-pro-0813', name: 'DeepSeek V4 Pro' },
    { id: 'deepseek-ai/deepseek-v4-flash-0731', name: 'DeepSeek V4 Flash' },
    { id: 'deepseek-ai/deepseek-coder-6.7b-instruct', name: 'DeepSeek Coder 6.7B Instruct' },

    // Google Gemma Series
    { id: 'google/gemma-4-31b-it', name: 'Google Gemma 4 31B IT' },
    { id: 'google/gemma-3-12b-it', name: 'Google Gemma 3 12B IT' },
    { id: 'google/gemma-3-4b-it', name: 'Google Gemma 3 4B IT' },
    { id: 'google/gemma-2-27b-it', name: 'Google Gemma 2 27B IT' },
    { id: 'google/gemma-2b', name: 'Google Gemma 2B' },
    { id: 'google/diffusiongemma-26b-a4b-it', name: 'Google DiffusionGemma 26B' },
    { id: 'google/codegemma-7b', name: 'Google CodeGemma 7B' },
    { id: 'google/codegemma-1.1-7b', name: 'Google CodeGemma 1.1 7B' },
    { id: 'google/deplot', name: 'Google DePlot' },
    { id: 'google/recurrentgemma-2b', name: 'Google RecurrentGemma 2B' },

    // Mistral AI Series
    { id: 'mistralai/mistral-large', name: 'Mistral Large' },
    { id: 'mistralai/mistral-large-2-instruct', name: 'Mistral Large 2 Instruct' },
    { id: 'mistralai/mistral-7b-instruct-v0.3', name: 'Mistral 7B Instruct v0.3' },
    { id: 'mistralai/mistral-nemotron', name: 'Mistral Nemotron' },
    { id: 'mistralai/mixtral-8x22b-instruct-v0.1', name: 'Mistral Mixtral 8x22B Instruct' },
    { id: 'mistralai/mixtral-8x22b-v0.1', name: 'Mistral Mixtral 8x22B' },
    { id: 'mistralai/codestral-22b-instruct-v0.1', name: 'Mistral Codestral 22B' },
    { id: 'nv-mistralai/mistral-nemo-12b-instruct', name: 'NV Mistral NeMo 12B Instruct' },

    // NVIDIA Native Nemotron Series
    { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning', name: 'NVIDIA Nemotron 3 Nano Omni 30B (Reasoning)' },
    { id: 'nvidia/nemotron-3-super-120b-a12b', name: 'NVIDIA Nemotron 3 Super 120B' },
    { id: 'nvidia/nemotron-3-ultra-550b-a55b', name: 'NVIDIA Nemotron 3 Ultra 550B' },
    { id: 'nvidia/nemotron-3.5-lightning-30b-a3b', name: 'NVIDIA Nemotron 3.5 Lightning 30B' },
    { id: 'nvidia/nemotron-4-340b-instruct', name: 'NVIDIA Nemotron 4 340B Instruct' },
    { id: 'nvidia/nemotron-nano-3-30b-a3b', name: 'NVIDIA Nemotron Nano 3 30B' },
    { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'NVIDIA Llama 3.1 Nemotron 70B' },
    { id: 'nvidia/llama-3.1-nemotron-51b-instruct', name: 'NVIDIA Llama 3.1 Nemotron 51B' },
    { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1', name: 'NVIDIA Llama 3.1 Nemotron Ultra 253B' },
    { id: 'nvidia/cosmos-reason2-8b', name: 'NVIDIA Cosmos Reason 2 8B' },
    { id: 'nvidia/ising-calibration-1.5-31b', name: 'NVIDIA Ising Calibration 31B' },
    { id: 'nvidia/llama3-chatqa-1.5-70b', name: 'NVIDIA ChatQA 1.5 70B' },
    { id: 'nvidia/mistral-nemo-minitron-8b-8k-instruct', name: 'NVIDIA Mistral NeMo Minitron 8B' },
    { id: 'nvidia/riva-translate-4b-instruct-v2', name: 'NVIDIA Riva Translate 4B v2' },
    { id: 'nvidia/riva-translate-4b-instruct-v1.1', name: 'NVIDIA Riva Translate 4B v1.1' },
    { id: 'nvidia/riva-translate-4b-instruct', name: 'NVIDIA Riva Translate 4B' },
    { id: 'nvidia/neva-22b', name: 'NVIDIA Neva 22B' },
    { id: 'nvidia/vila', name: 'NVIDIA Vila' },
    { id: 'nvidia/llama-3.1-nemoguard-8b-content-safety', name: 'NVIDIA Llama 3.1 NemoGuard 8B' },
    { id: 'nvidia/llama-3.1-nemoguard-8b-topic-control', name: 'NVIDIA NemoGuard Topic Control 8B' },
    { id: 'nvidia/llama-3.1-nemotron-safety-guard-8b-v3', name: 'NVIDIA Nemotron Safety Guard 8B' },
    { id: 'nvidia/nemotron-3.5-content-safety', name: 'NVIDIA Nemotron 3.5 Content Safety' },

    // Qwen & Open Frontier
    { id: 'qwen/qwen2.5-72b-instruct', name: 'Qwen 2.5 72B Instruct' },
    { id: 'minimaxai/minimax-m3', name: 'MiniMax M3' },
    { id: '01-ai/yi-large', name: '01.AI Yi Large' },
    { id: 'ai21labs/jamba-1.5-large-instruct', name: 'AI21 Jamba 1.5 Large Instruct' },
    { id: 'databricks/dbrx-instruct', name: 'Databricks DBRX Instruct' },
    { id: 'ibm/granite-3.0-8b-instruct', name: 'IBM Granite 3.0 8B Instruct' },
    { id: 'ibm/granite-3.0-3b-a800m-instruct', name: 'IBM Granite 3.0 3B Instruct' },
    { id: 'ibm/granite-34b-code-instruct', name: 'IBM Granite 34B Code Instruct' },
    { id: 'ibm/granite-8b-code-instruct', name: 'IBM Granite 8B Code Instruct' },
    { id: 'microsoft/phi-3.5-moe-instruct', name: 'Microsoft Phi 3.5 MoE Instruct' },
    { id: 'microsoft/phi-3-vision-128k-instruct', name: 'Microsoft Phi 3 Vision 128k' },
    { id: 'microsoft/kosmos-2', name: 'Microsoft Kosmos 2' },
    { id: 'moonshotai/kimi-k3', name: 'Moonshot AI Kimi K3' },
    { id: 'moonshotai/kimi-k2.6', name: 'Moonshot AI Kimi K2.6' },
    { id: 'openai/gpt-oss-120b', name: 'OpenAI GPT OSS 120B' },
    { id: 'openai/gpt-oss-20b', name: 'OpenAI GPT OSS 20B' },
    { id: 'poolside/laguna-xs-2.1', name: 'Poolside Laguna XS 2.1' },
    { id: 'writer/palmyra-creative-122b', name: 'Writer Palmyra Creative 122B' },
    { id: 'writer/palmyra-fin-70b-32k', name: 'Writer Palmyra Fin 70B' },
    { id: 'writer/palmyra-med-70b-32k', name: 'Writer Palmyra Med 70B' },
    { id: 'writer/palmyra-med-70b', name: 'Writer Palmyra Med 70B Base' },
    { id: 'zyphra/zamba2-7b-instruct', name: 'Zyphra Zamba2 7B Instruct' },
    { id: 'aisingapore/sea-lion-7b-instruct', name: 'AI Singapore SEA-LION 7B' },
    { id: 'bigcode/starcoder2-15b', name: 'BigCode StarCoder2 15B' },
    { id: 'adept/fuyu-8b', name: 'Adept Fuyu 8B' },
  ],
  groq: [
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B (Ultra-Low Latency & JSON Parsing)' },
    { id: 'groq/compound-mini', name: 'Groq Compound Mini (Fast Reasoning)' },
    { id: 'groq/compound', name: 'Groq Compound (Deep Multi-Stage Reasoning)' },
    { id: 'openai/gpt-oss-120b', name: 'OpenAI GPT OSS 120B' },
    { id: 'openai/gpt-oss-20b', name: 'OpenAI GPT OSS 20B' },
    { id: 'qwen/qwen3.6-27b', name: 'Qwen 3.6 27B' },
    { id: 'allam-2-7b', name: 'ALLaM 2 7B' },
    { id: 'canopylabs/orpheus-v1-english', name: 'CanopyLabs Orpheus v1 English' },
    { id: 'canopylabs/orpheus-arabic-saudi', name: 'CanopyLabs Orpheus Arabic' },
    { id: 'meta-llama/llama-prompt-guard-2-22m', name: 'Llama Prompt Guard 2 22M' },
    { id: 'meta-llama/llama-prompt-guard-2-86m', name: 'Llama Prompt Guard 2 86M' },
    { id: 'openai/gpt-oss-safeguard-20b', name: 'OpenAI GPT OSS Safeguard 20B' },
    { id: 'whisper-large-v3', name: 'Whisper Large v3 (Audio/Speech)' },
    { id: 'whisper-large-v3-turbo', name: 'Whisper Large v3 Turbo' },
  ],
  gemini: [
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Structured Parsing & Extraction)' },
    { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (Reasoning & Suggestions)' },
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Fast Parsing)' },
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite (Ultra-Low Latency)' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o (Flagship)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast)' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  ],
  mock: [
    { id: 'heuristic-rule-engine-v1', name: 'Local Smart Heuristic Engine (Offline / No Key)' },
  ],
};

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSave,
}) => {
  const [provider, setProvider] = useState<AIProvider>(currentSettings.provider);
  const [model, setModel] = useState<string>(currentSettings.model);
  const [modelParse, setModelParse] = useState<string>(currentSettings.modelParse || 'meta/llama-3.2-11b-vision-instruct');
  const [modelReason, setModelReason] = useState<string>(currentSettings.modelReason || 'meta/llama-3.2-11b-vision-instruct');
  const [secondaryProvider, setSecondaryProvider] = useState<AIProvider | undefined>(currentSettings.secondaryProvider);
  const [secondaryModel, setSecondaryModel] = useState<string | undefined>(currentSettings.secondaryModel);
  const [apiKeys, setApiKeys] = useState(currentSettings.apiKeys);
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setProvider(currentSettings.provider);
    setModel(currentSettings.model);
    setModelParse(currentSettings.modelParse || (currentSettings.provider === 'nvidia' ? 'meta/llama-3.2-11b-vision-instruct' : currentSettings.provider === 'groq' ? 'qwen/qwen3.8-27b' : 'gemini-3.6-flash'));
    setModelReason(currentSettings.modelReason || (currentSettings.provider === 'nvidia' ? 'meta/llama-3.2-11b-vision-instruct' : currentSettings.provider === 'groq' ? 'groq/compound-mini' : 'gemini-3.7-flash'));
    setSecondaryProvider(currentSettings.secondaryProvider);
    setSecondaryModel(currentSettings.secondaryModel);
    setApiKeys(currentSettings.apiKeys);
  }, [currentSettings]);

  // Update model default when provider changes
  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    const availableModels = MODEL_OPTIONS[newProvider];
    if (availableModels && availableModels.length > 0) {
      if (newProvider === 'groq') {
        setModel('groq/compound-mini');
        setModelParse('qwen/qwen3.8-27b');
        setModelReason('groq/compound-mini');
      } else if (newProvider === 'nvidia') {
        setModel('meta/llama-3.2-90b-vision-instruct');
        setModelParse('meta/llama-3.2-11b-vision-instruct');
        setModelReason('meta/llama-3.2-90b-vision-instruct');
      } else if (newProvider === 'gemini') {
        setModel('gemini-3.7-flash');
        setModelParse('gemini-3.6-flash');
        setModelReason('gemini-3.7-flash');
      } else {
        setModel(availableModels[0].id);
      }
    }
  };

  const handleSave = () => {
    onSave({
      provider,
      model,
      modelParse,
      modelReason,
      secondaryProvider: secondaryProvider === ('none' as any) ? undefined : secondaryProvider,
      secondaryModel,
      apiKeys,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl rounded-2xl border border-white/[0.08] bg-[#111114] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 sm:px-6 py-3.5 sm:py-4 shrink-0">
          <div className="flex items-center space-x-2">
            <Cpu className="h-4 w-4 text-zinc-300 shrink-0" />
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-100">
              AI Model &amp; Provider Configuration
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Active Provider Selector */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Frontier Model Provider
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
              {(['groq', 'nvidia', 'gemini', 'openai', 'anthropic'] as AIProvider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleProviderChange(p)}
                  className={`flex flex-col items-center justify-center rounded-xl border p-2 sm:p-2.5 text-center transition ${
                    provider === p
                      ? 'border-zinc-200 bg-zinc-800 text-white shadow-sm'
                      : 'border-white/[0.06] bg-[#09090b] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <span className="text-xs font-semibold capitalize">{p}</span>
                  <span className="text-[9px] text-zinc-500 font-mono mt-0.5">
                    {p === 'groq' ? 'LPU Fast' : p === 'nvidia' ? 'Open NIM' : p === 'gemini' ? 'Google' : p === 'openai' ? 'GPT-4o' : 'Claude 3.5'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Model Preset Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Reasoning Model Architecture
              </label>
            </div>
            <select
              value={MODEL_OPTIONS[provider]?.some((m) => m.id === model) ? model : 'custom'}
              onChange={(e) => {
                if (e.target.value !== 'custom') {
                  setModel(e.target.value);
                  setModelParse(e.target.value);
                  setModelReason(e.target.value);
                }
              }}
              className="w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
            >
              {MODEL_OPTIONS[provider]?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
              <option value="custom">Custom Model Identifier...</option>
            </select>

            {/* Custom Model Input */}
            <div>
              <input
                type="text"
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  setModelParse(e.target.value);
                  setModelReason(e.target.value);
                }}
                placeholder="Or type custom model ID (e.g. meta/llama-3.2-11b-vision-instruct)..."
                className="w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Role-Based Assignment Details */}
          {(provider === 'nvidia' || provider === 'groq' || provider === 'gemini') && (
            <div className="rounded-xl border border-white/[0.06] bg-[#09090b] p-3 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-zinc-300 text-[11px]">
                <Layers className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span>Single-Run Model Configuration</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="bg-zinc-900/80 p-2 rounded-lg border border-white/[0.04] min-w-0">
                  <span className="text-zinc-500 block text-[10px]">Parse / Extract Step:</span>
                  <span className="font-mono text-zinc-200 font-medium truncate block">{modelParse}</span>
                </div>
                <div className="bg-zinc-900/80 p-2 rounded-lg border border-white/[0.04] min-w-0">
                  <span className="text-zinc-500 block text-[10px]">Reason / Rewrites Step:</span>
                  <span className="font-mono text-zinc-200 font-medium truncate block">{modelReason}</span>
                </div>
              </div>
            </div>
          )}

          {/* Dual-Model Consensus Check */}
          <div className="pt-3 border-t border-white/[0.06]">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span>Dual-Model Consensus Check (Optional)</span>
            </label>
            <p className="text-[11px] text-zinc-500 mb-2">
              Calls a secondary provider in parallel on gap-analysis. Items where models disagree are flagged for review.
            </p>
            <select
              value={secondaryProvider || 'none'}
              onChange={(e) => {
                const val = e.target.value as AIProvider | 'none';
                if (val === 'none') {
                  setSecondaryProvider(undefined);
                  setSecondaryModel(undefined);
                } else {
                  setSecondaryProvider(val);
                  setSecondaryModel(MODEL_OPTIONS[val]?.[0]?.id);
                }
              }}
              className="w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
            >
              <option value="none">Disabled (Single model classification)</option>
              <option value="groq">Groq (Qwen 3.8 27B)</option>
              <option value="nvidia">NVIDIA NIM (Llama 3.2 11B)</option>
              <option value="gemini">Gemini (3.6 Flash)</option>
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 border-t border-white/[0.06] bg-[#09090b] px-4 sm:px-6 py-3.5 sm:py-4 shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/[0.08] bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition text-center"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center justify-center space-x-1.5 rounded-lg px-4 py-2 text-xs font-medium text-black transition active:scale-[0.98] cursor-pointer ${
              savedSuccess ? 'bg-emerald-400 text-black' : 'bg-white hover:bg-zinc-200'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Saved Settings!</span>
              </>
            ) : (
              <span>Save Configuration</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
