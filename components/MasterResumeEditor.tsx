'use client';

import React, { useState } from 'react';
import { Save, RotateCcw, FileText, Check, Plus, Trash2, ShieldCheck, Code, Eye } from 'lucide-react';
import { MasterResume } from '@/lib/engine/types';

interface MasterResumeEditorProps {
  masterResume: MasterResume;
  onSave: (updated: MasterResume) => void;
  onReset: () => void;
}

export const MasterResumeEditor: React.FC<MasterResumeEditorProps> = ({
  masterResume,
  onSave,
  onReset,
}) => {
  const [jsonText, setJsonText] = useState(JSON.stringify(masterResume, null, 2));
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      onSave(parsed);
      setErrorMsg('');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 1500);
    } catch (err: any) {
      setErrorMsg('Invalid JSON syntax: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & View Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#111114] p-5 shadow-xl">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <FileText className="h-4 w-4 text-zinc-300" />
            Canonical Master Ground Truth
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Single structured data record of every role, metric, bullet, and skill you have produced.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Segmented Visual / JSON Switcher */}
          <div className="flex items-center rounded-lg bg-zinc-900 p-0.5 border border-white/[0.06]">
            <button
              onClick={() => setViewMode('visual')}
              className={`flex items-center space-x-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === 'visual'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="h-3 w-3" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`flex items-center space-x-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === 'json'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code className="h-3 w-3" />
              <span>JSON</span>
            </button>
          </div>

          <button
            onClick={onReset}
            className="flex items-center space-x-1.5 rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200 active:scale-[0.98]"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 font-mono">
          {errorMsg}
        </div>
      )}

      {viewMode === 'json' ? (
        <div className="space-y-4">
          <textarea
            rows={22}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full rounded-2xl border border-white/[0.08] bg-[#09090b] p-5 font-mono text-xs leading-relaxed text-zinc-200 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 shadow-inner"
          />

          <div className="flex justify-end">
            <button
              onClick={handleSaveJson}
              className="flex items-center space-x-2 rounded-xl bg-zinc-100 px-6 py-2.5 text-xs font-semibold text-zinc-900 transition hover:bg-white active:scale-[0.98] shadow-md"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-zinc-900" />
                  <span>Saved Master JSON</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 text-zinc-900" />
                  <span>Save Master JSON</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Contact Block Card */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-5 space-y-3 shadow-sm">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Contact Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-zinc-300">
              <div><span className="text-zinc-500">Name:</span> {masterResume.contact_block.name}</div>
              <div><span className="text-zinc-500">Email:</span> {masterResume.contact_block.email}</div>
              <div><span className="text-zinc-500">Location:</span> {masterResume.contact_block.location}</div>
            </div>
          </div>

          {/* Master Skills Inventory */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-5 space-y-3 shadow-sm">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Master Skills Inventory</h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                ...masterResume.skills_section.languages,
                ...masterResume.skills_section.frameworks,
                ...masterResume.skills_section.tools_platforms,
                ...masterResume.skills_section.practices,
              ].map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 text-xs bg-zinc-900/80 border border-white/[0.06] text-zinc-300 rounded-md font-mono"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Master Experience Records */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Experience Records ({masterResume.experience.length})
            </h3>

            {masterResume.experience.map((exp) => (
              <div key={exp.id} className="rounded-xl border border-white/[0.08] bg-[#111114] p-6 space-y-4 shadow-sm">
                <div>
                  <h4 className="text-sm font-bold text-zinc-100">{exp.title}</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">{exp.company} • {exp.dates}</p>
                </div>

                <div className="space-y-2">
                  {exp.bullets.map((b) => (
                    <div key={b.id} className="rounded-lg bg-[#09090b] p-3.5 border border-white/[0.06] space-y-2">
                      <p className="text-xs font-mono text-zinc-200 leading-relaxed">• {b.text}</p>

                      <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        <span className="text-zinc-500 font-medium">Domains:</span>
                        {b.domains.map((d) => (
                          <span key={d} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/[0.06]">
                            {d}
                          </span>
                        ))}
                        {b.metrics.length > 0 && (
                          <span className="ml-auto text-emerald-400 font-mono">
                            Metrics: {b.metrics.join(' | ')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
