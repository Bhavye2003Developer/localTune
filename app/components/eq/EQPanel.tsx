'use client';

import React, { useReducer, useState, useEffect, useCallback, useRef, memo } from 'react';
import { eqReducer, INITIAL_EQ_STATE, BUILTIN_PRESETS } from '../../lib/eqPresets';
import type { Band, EQAction } from '../../lib/eqPresets';
import { EQCurve } from './EQCurve';
import { db } from '../../lib/db';

interface Props {
  open: boolean;
  onClose: () => void;
  setEQBandGain: (index: number, gainDb: number) => void;
  setEQBypass: (on: boolean) => void;
  embedded?: boolean;
}

interface CustomPreset {
  id?: number;
  name: string;
  bands: { freq: number; gain: number; q: number }[];
}

// ─── Band slider constants ────────────────────────────────────────────────────

const SLIDER_DB = 15;
const SLIDER_TRACK_H = 64; // px, visual track height
const SLIDER_INSET = 6;    // px, top/bottom deadzone within the track container

function freqLabel(f: number): string {
  return f >= 1000 ? `${f / 1000}k` : `${f}`;
}

function gainText(g: number): string {
  if (g === 0) return '0';
  return g > 0 ? `+${g.toFixed(1)}` : g.toFixed(1);
}

// ─── Single vertical band slider ──────────────────────────────────────────────

const SLIDER_INNER_H = SLIDER_TRACK_H - 2 * SLIDER_INSET; // 52 px — actual draggable range

const BandSliderCol = memo(function BandSliderCol({
  band,
  index,
  bypass,
  dispatch,
}: {
  band: Band;
  index: number;
  bypass: boolean;
  dispatch: React.Dispatch<EQAction>;
}) {
  const isDragging = useRef(false);
  const [active, setActive] = useState(false);

  // 0 = +15dB (top), 1 = -15dB (bottom)
  const gainFrac  = (SLIDER_DB - band.gain) / (2 * SLIDER_DB);
  const centerFrac = 0.5;
  const fillFromFrac = Math.min(gainFrac, centerFrac);
  const fillToFrac   = Math.max(gainFrac, centerFrac);
  const hasGain  = band.gain !== 0;
  const gainColor = 'var(--a)';

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (bypass) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    setActive(true);
  }, [bypass]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const innerH = rect.height - 2 * SLIDER_INSET;
    if (innerH <= 0) return;
    const y = Math.max(0, Math.min(innerH, e.clientY - rect.top - SLIDER_INSET));
    const newGain = SLIDER_DB - (y / innerH) * (2 * SLIDER_DB);
    dispatch({
      type: 'SET_BAND_GAIN',
      index,
      gain: parseFloat(Math.max(-SLIDER_DB, Math.min(SLIDER_DB, newGain)).toFixed(1)),
    });
  }, [dispatch, index]);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
    setActive(false);
  }, []);

  const onDblClick = useCallback(() => {
    if (bypass) return;
    dispatch({ type: 'SET_BAND_GAIN', index, gain: 0 });
  }, [bypass, dispatch, index]);

  return (
    <div
      className="flex-1 flex flex-col items-center gap-0.5 select-none"
      style={{ opacity: bypass ? 0.25 : 1, minWidth: 0 }}
    >
      {/* Gain readout */}
      <span
        className="font-mono leading-none"
        style={{
          fontSize: 8,
          color: hasGain ? gainColor : 'var(--t3)',
          transition: 'color 0.1s',
        }}
      >
        {gainText(band.gain)}
      </span>

      {/* Slider track */}
      <div
        className="relative flex justify-center"
        style={{ width: '100%', height: SLIDER_TRACK_H, cursor: bypass ? 'default' : 'ns-resize', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDblClick}
      >
        {/* Track background */}
        <div
          className="absolute"
          style={{
            width: 2,
            top: SLIDER_INSET,
            bottom: SLIDER_INSET,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--s5)',
          }}
        />

        {/* Fill (from 0dB center to thumb) */}
        {hasGain && (
          <div
            className="absolute"
            style={{
              width: 2,
              left: '50%',
              transform: 'translateX(-50%)',
              top: SLIDER_INSET + fillFromFrac * SLIDER_INNER_H,
              height: (fillToFrac - fillFromFrac) * SLIDER_INNER_H,
              background: gainColor,
              opacity: 0.8,
            }}
          />
        )}

        {/* 0 dB tick mark */}
        <div
          className="absolute"
          style={{
            width: 6,
            height: 1,
            left: '50%',
            transform: 'translateX(-50%)',
            top: SLIDER_INSET + SLIDER_INNER_H / 2,
            background: 'rgba(255,255,255,0.15)',
          }}
        />

        {/* Thumb (diamond) */}
        <div
          className="absolute"
          style={{
            width: 8,
            height: 8,
            left: '50%',
            top: SLIDER_INSET + gainFrac * SLIDER_INNER_H - 4,
            transform: 'translateX(-50%) rotate(45deg)',
            background: active
              ? 'var(--a)'
              : hasGain
                ? gainColor
                : 'var(--s2)',
            border: `1.5px solid ${active ? 'var(--a)' : 'rgba(245,158,11,0.4)'}`,
            transition: active ? 'none' : 'background 0.1s',
          }}
        />
      </div>

      {/* Frequency label */}
      <span
        className="font-mono leading-none"
        style={{ fontSize: 8, color: 'var(--t3)' }}
      >
        {freqLabel(band.freq)}
      </span>
    </div>
  );
});

// ─── Band sliders row ─────────────────────────────────────────────────────────

const BandSliders = memo(function BandSliders({
  bands,
  bypass,
  dispatch,
}: {
  bands: Band[];
  bypass: boolean;
  dispatch: React.Dispatch<EQAction>;
}) {
  return (
    <div
      className="flex gap-0 px-2 py-1.5 shrink-0 border-t"
      style={{ borderColor: 'var(--br)' }}
    >
      {bands.map((band, i) => (
        <BandSliderCol key={i} band={band} index={i} bypass={bypass} dispatch={dispatch} />
      ))}
    </div>
  );
});

// ─── Main panel ──────────────────────────────────────────────────────────────

export const EQPanel = memo(function EQPanel({
  open,
  onClose,
  setEQBandGain,
  setEQBypass,
  embedded,
}: Props) {
  const [state, dispatch] = useReducer(eqReducer, INITIAL_EQ_STATE);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');

  useEffect(() => {
    state.bands.forEach((band, i) => setEQBandGain(i, band.gain));
  }, [state.bands, setEQBandGain]);

  useEffect(() => {
    setEQBypass(state.bypass);
  }, [state.bypass, setEQBypass]);

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
    if (e.key === 'Enter')  handleSave();
    if (e.key === 'Escape') { setSaving(false); setSaveName(''); }
  }, [handleSave]);

  if (!open) return null;

  const activeCount = state.activePresets.length;
  const isFlat = activeCount === 0;

  return (
    <div className="flex flex-col h-full">

      {/* ── Header Row 1: label + action buttons ── */}
      <div
        className="flex items-center gap-2 px-3 pt-2 pb-1.5 shrink-0"
        style={{ borderBottom: '1px solid var(--br)' }}
      >
        <span style={{ color: 'var(--t1)', fontSize: 14, fontWeight: 800 }}>EQ</span>

        {activeCount > 1 && (
          <span
            className="text-[8px] px-1.5 py-0.5 rounded shrink-0"
            style={{ color: 'var(--a)', border: '1px solid #f59e0b45', background: '#f59e0b18', fontWeight: 700 }}
          >
            {activeCount} active
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {/* Bypass */}
          <button
            aria-label={state.bypass ? 'bypass on' : 'bypass off'}
            aria-pressed={state.bypass}
            onClick={() => dispatch({ type: 'TOGGLE_BYPASS' })}
            className="text-[9px] px-2 py-0.5 rounded transition-colors touch-manipulation"
            style={{
              border: `1px solid ${state.bypass ? 'var(--orange)' : 'var(--br)'}`,
              color: state.bypass ? 'var(--orange)' : 'var(--t2)',
              background: state.bypass ? 'rgba(249,115,22,0.1)' : 'transparent',
              fontWeight: 700,
            }}
          >
            Bypass
          </button>

          {/* Flat */}
          <button
            aria-label="Reset to flat"
            onClick={() => dispatch({ type: 'RESET_FLAT' })}
            className="text-[9px] px-2 py-0.5 rounded transition-colors touch-manipulation"
            style={{
              border: `1px solid ${isFlat ? '#f59e0b45' : 'var(--br)'}`,
              color: isFlat ? 'var(--a)' : 'var(--t2)',
              background: isFlat ? '#f59e0b18' : 'transparent',
              fontWeight: 700,
            }}
          >
            Flat
          </button>

          {/* Save / input */}
          {saving ? (
            <input
              autoFocus
              type="text"
              placeholder="preset name..."
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={handleSaveKeyDown}
              className="text-[9px] px-2 py-0.5 bg-transparent outline-none w-24 rounded"
              style={{
                border: '1px solid var(--br)',
                color: 'var(--t1)',
                caretColor: 'var(--a)',
                fontWeight: 500,
              }}
            />
          ) : (
            <button
              aria-label="Save preset"
              onClick={() => setSaving(true)}
              className="text-[9px] px-2 py-0.5 rounded transition-colors touch-manipulation"
              style={{ border: '1px solid var(--br)', color: 'var(--t2)', fontWeight: 700 }}
            >
              Save
            </button>
          )}

          {/* Close — hidden when embedded */}
          {!embedded && (
            <button
              aria-label="Close EQ panel"
              onClick={onClose}
              className="flex items-center justify-center w-6 h-6 rounded transition-colors touch-manipulation"
              style={{ color: 'var(--t2)', background: 'transparent' }}
              onMouseEnter={e => { (e.currentTarget).style.color = 'var(--t1)'; }}
              onMouseLeave={e => { (e.currentTarget).style.color = 'var(--t2)'; }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Header Row 2: preset chips ── */}
      <div
        className="flex gap-1 px-3 py-1.5 overflow-x-auto shrink-0"
        style={{ borderBottom: '1px solid var(--br)' }}
      >
        {BUILTIN_PRESETS.filter(p => p.name !== 'Flat').map(p => {
          const isActive = state.activePresets.includes(p.name);
          return (
            <button
              key={p.name}
              aria-label={p.name}
              onClick={() => togglePreset(p.gains, p.name)}
              className="text-[9px] px-2 py-1 rounded shrink-0 touch-manipulation transition-colors"
              style={{
                border: `1px solid ${isActive ? '#f59e0b45' : 'var(--br)'}`,
                color: isActive ? 'var(--a)' : 'var(--t2)',
                background: isActive ? '#f59e0b18' : 'transparent',
                fontWeight: 700,
              }}
            >
              {p.name}
            </button>
          );
        })}
        {customPresets.map(p => {
          const isActive = state.activePresets.includes(p.name);
          return (
            <button
              key={p.id ?? p.name}
              aria-label={p.name}
              onClick={() => togglePreset(p.bands.map(b => b.gain), p.name)}
              className="text-[9px] px-2 py-1 rounded shrink-0 touch-manipulation transition-colors"
              style={{
                border: `1px solid ${isActive ? '#f59e0b45' : 'var(--br)'}`,
                color: isActive ? 'var(--a)' : 'var(--t2)',
                background: isActive ? '#f59e0b18' : 'transparent',
                fontWeight: 700,
              }}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {/* ── EQ Curve — fills remaining height ── */}
      <div className="flex-1 min-h-0">
        <EQCurve state={state} dispatch={dispatch} />
      </div>

      {/* ── Vertical band sliders ── */}
      <BandSliders bands={state.bands} bypass={state.bypass} dispatch={dispatch} />
    </div>
  );
});
