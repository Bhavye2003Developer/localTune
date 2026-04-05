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

  const togglePreset = useCallback((gains: number[], name: string) => {
    dispatch({ type: 'TOGGLE_PRESET', gains, name });
  }, []);

  const handleSave = useCallback(async () => {
    const name = saveName.trim();
    if (!name) return;
    const entry = { name, bands: state.bands.map(b => ({ freq: b.freq, gain: b.gain, q: b.q })) };
    await db.eqPresets.add(entry);
    setCustomPresets(prev => [...prev, entry]);
    dispatch({ type: 'LOAD_PRESET', gains: state.bands.map(b => b.gain), name });
    setSaving(false);
    setSaveName('');
  }, [saveName, state.bands]);

  const handleSaveKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setSaving(false); setSaveName(''); }
  }, [handleSave]);

  if (!open) return null;

  const activeCount = state.activePresets.length;

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono uppercase tracking-widest text-[9px] shrink-0" style={{ color: 'var(--nx-cyan-dim)' }}>
          ◈ SIGNAL PROCESSOR
        </span>

        {/* Bypass toggle */}
        <button
          aria-label={state.bypass ? 'bypass on' : 'bypass off'}
          aria-pressed={state.bypass}
          onClick={() => dispatch({ type: 'TOGGLE_BYPASS' })}
          className="font-mono uppercase tracking-widest text-[9px] px-2 py-0.5 transition-colors touch-manipulation"
          style={{
            border: `1px solid ${state.bypass ? 'var(--nx-red)' : 'rgba(0,212,255,0.2)'}`,
            color: state.bypass ? 'var(--nx-red)' : 'var(--nx-text-dim)',
            background: state.bypass ? 'rgba(255,0,60,0.08)' : 'transparent',
          }}
        >
          BYPASS
        </button>

        {/* Active count badge */}
        {activeCount > 1 && (
          <span className="font-mono text-[9px] px-1.5 py-0.5 shrink-0" style={{ color: 'var(--nx-cyan)', border: '1px solid rgba(0,212,255,0.3)' }}>
            {activeCount} ACTIVE
          </span>
        )}

        {/* Flat / reset button */}
        <button
          aria-label="Reset to flat"
          onClick={() => dispatch({ type: 'RESET_FLAT' })}
          className="font-mono uppercase tracking-widest text-[9px] px-2 py-0.5 transition-colors shrink-0 touch-manipulation"
          style={{
            border: `1px solid ${state.activePresets.length === 0 ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.2)'}`,
            color: state.activePresets.length === 0 ? 'var(--nx-cyan)' : 'var(--nx-text-dim)',
            background: state.activePresets.length === 0 ? 'rgba(0,212,255,0.08)' : 'transparent',
          }}
        >
          FLAT
        </button>

        {/* Preset chips — horizontal scroll on mobile, wrap on desktop */}
        <div className="flex gap-1 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-0.5 sm:pb-0 max-w-full">
          {BUILTIN_PRESETS.filter(p => p.name !== 'Flat').map(p => (
            <button
              key={p.name}
              aria-label={p.name}
              onClick={() => togglePreset(p.gains, p.name)}
              className="font-mono uppercase tracking-widest text-[9px] px-2 py-1 transition-colors shrink-0 touch-manipulation"
              style={{
                border: `1px solid ${state.activePresets.includes(p.name) ? 'rgba(0,212,255,0.6)' : 'rgba(0,212,255,0.15)'}`,
                color: state.activePresets.includes(p.name) ? 'var(--nx-cyan)' : 'var(--nx-text-dim)',
                background: state.activePresets.includes(p.name) ? 'rgba(0,212,255,0.08)' : 'transparent',
              }}
            >
              {p.name}
            </button>
          ))}
          {customPresets.map(p => (
            <button
              key={p.id ?? p.name}
              aria-label={p.name}
              onClick={() => togglePreset(p.bands.map(b => b.gain), p.name)}
              className="font-mono uppercase tracking-widest text-[9px] px-2 py-1 transition-colors shrink-0 touch-manipulation"
              style={{
                border: `1px solid ${state.activePresets.includes(p.name) ? 'rgba(0,212,255,0.6)' : 'rgba(0,212,255,0.15)'}`,
                color: state.activePresets.includes(p.name) ? 'var(--nx-cyan)' : 'var(--nx-text-dim)',
                background: state.activePresets.includes(p.name) ? 'rgba(0,212,255,0.08)' : 'transparent',
              }}
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
            placeholder="preset name..."
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={handleSaveKeyDown}
            className="font-mono text-[10px] px-2 py-0.5 bg-transparent outline-none w-32"
            style={{
              border: '1px solid rgba(0,212,255,0.3)',
              color: 'var(--nx-text)',
              caretColor: 'var(--nx-cyan)',
            }}
          />
        ) : (
          <button
            aria-label="Save preset"
            onClick={() => setSaving(true)}
            className="font-mono uppercase tracking-widest text-[9px] px-2 py-0.5 transition-colors ml-auto touch-manipulation"
            style={{
              border: '1px solid rgba(0,212,255,0.15)',
              color: 'var(--nx-text-dim)',
            }}
          >
            SAVE
          </button>
        )}

        {/* Close */}
        <button
          aria-label="Close EQ panel"
          onClick={onClose}
          className="font-mono text-[10px] px-1.5 py-0.5 transition-colors touch-manipulation"
          style={{ color: 'var(--nx-text-dim)' }}
          onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-red)'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; }}
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
