'use client';

import React, { useReducer, useState, useEffect, useCallback, memo } from 'react';
import { eqReducer, INITIAL_EQ_STATE, BUILTIN_PRESETS } from '../../lib/eqPresets';
import type { EQState } from '../../lib/eqPresets';
import { EQCurve } from './EQCurve';
import { db } from '../../lib/db';

interface Props {
  open: boolean;
  onClose: () => void;
  setEQBandGain: (index: number, gainDb: number) => void;
  setEQBypass: (on: boolean) => void;
}

interface CustomPreset {
  id?: number;
  name: string;
  bands: { freq: number; gain: number; q: number }[];
}

export const EQPanel = memo(function EQPanel({ open, onClose, setEQBandGain, setEQBypass }: Props) {
  const [state, dispatch] = useReducer(eqReducer, INITIAL_EQ_STATE);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');

  // Sync EQ band gains to audio nodes when state changes
  useEffect(() => {
    state.bands.forEach((band, i) => setEQBandGain(i, band.gain));
  }, [state.bands, setEQBandGain]);

  // Sync bypass to audio nodes
  useEffect(() => {
    setEQBypass(state.bypass);
  }, [state.bypass, setEQBypass]);

  // Load custom presets from Dexie
  useEffect(() => {
    if (!open) return;
    db.eqPresets.toArray().then(setCustomPresets).catch(() => {});
  }, [open]);

  const loadPreset = useCallback((gains: number[], name: string) => {
    dispatch({ type: 'LOAD_PRESET', gains, name });
    // useEffect on state.bands handles syncing gains to audio nodes
  }, []);

  const handleSave = useCallback(async () => {
    const name = saveName.trim();
    if (!name) return;
    const entry = { name, bands: state.bands.map(b => ({ freq: b.freq, gain: b.gain, q: b.q })) };
    await db.eqPresets.add(entry);
    setCustomPresets(prev => [...prev, entry]);
    dispatch({ type: 'SET_PRESET_NAME', name });
    setSaving(false);
    setSaveName('');
  }, [saveName, state.bands]);

  const handleSaveKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setSaving(false); setSaveName(''); }
  }, [handleSave]);

  if (!open) return null;

  return (
    <div className="flex flex-col gap-2 px-3 py-2 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-white tracking-wide">EQ</span>

        {/* Bypass toggle */}
        <button
          aria-label={state.bypass ? 'bypass on' : 'bypass off'}
          aria-pressed={state.bypass}
          onClick={() => dispatch({ type: 'TOGGLE_BYPASS' })}
          className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
            state.bypass
              ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
              : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
          }`}
        >
          Bypass
        </button>

        {/* Preset chips — horizontal scroll on mobile, wrap on desktop */}
        <div className="flex gap-1 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-0.5 sm:pb-0 max-w-full">
          {BUILTIN_PRESETS.map(p => (
            <button
              key={p.name}
              aria-label={p.name}
              onClick={() => loadPreset(p.gains, p.name)}
              className={`px-2 py-1 rounded text-xs border transition-colors shrink-0 touch-manipulation ${
                state.presetName === p.name
                  ? 'bg-violet-600/40 border-violet-500/60 text-violet-200'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
              }`}
            >
              {p.name}
            </button>
          ))}
          {customPresets.map(p => (
            <button
              key={p.id ?? p.name}
              aria-label={p.name}
              onClick={() => loadPreset(p.bands.map(b => b.gain), p.name)}
              className={`px-2 py-1 rounded text-xs border transition-colors shrink-0 touch-manipulation ${
                state.presetName === p.name
                  ? 'bg-violet-600/40 border-violet-500/60 text-violet-200'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Save / name input */}
        {saving ? (
          <input
            autoFocus
            type="text"
            placeholder="Preset name…"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={handleSaveKeyDown}
            className="px-2 py-0.5 rounded text-xs bg-white/10 border border-white/20 text-white outline-none focus:border-violet-500 w-32"
          />
        ) : (
          <button
            aria-label="Save preset"
            onClick={() => setSaving(true)}
            className="px-2 py-0.5 rounded text-xs bg-white/5 border border-white/10 text-white/50 hover:text-white/80 transition-colors ml-auto"
          >
            Save
          </button>
        )}

        {/* Close */}
        <button
          aria-label="Close EQ panel"
          onClick={onClose}
          className="ml-auto text-white/40 hover:text-white/80 transition-colors text-base leading-none px-1"
        >
          ✕
        </button>
      </div>

      {/* Curve */}
      <div className="flex-1 min-h-0">
        <EQCurve state={state} dispatch={dispatch} />
      </div>
    </div>
  );
});
