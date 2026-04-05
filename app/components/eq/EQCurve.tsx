'use client';

import React, { useRef, useState, useCallback, useMemo, memo } from 'react';
import type { EQState, EQAction, Band } from '../../lib/eqPresets';

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 600;
const H = 160;
const PAD_L = 28;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 20;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;
const DB_RANGE = 15; // ±15 dB

// ─── Frequency array: 512 log-spaced points from 20 Hz to 20 kHz ─────────────

export const logFreqs: number[] = Array.from({ length: 512 }, (_, i) =>
  20 * Math.pow(1000, i / 511)
);

// ─── Mathematical biquad transfer function ───────────────────────────────────
// Computes gain (dB) at frequency f for a single band.

export function biquadResponse(band: Band, f: number): number {
  if (band.gain === 0) return 0;

  const fs = 96000; // sample rate for transfer function evaluation
  const w0 = (2 * Math.PI * band.freq) / fs;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const A = Math.pow(10, band.gain / 40);
  const alpha = sinW0 / (2 * band.q);

  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;

  if (band.type === 'peaking') {
    b0 = 1 + alpha * A;
    b1 = -2 * cosW0;
    b2 = 1 - alpha * A;
    a0 = 1 + alpha / A;
    a1 = -2 * cosW0;
    a2 = 1 - alpha / A;
  } else if (band.type === 'lowshelf') {
    b0 = A * ((A + 1) - (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha);
    b1 = 2 * A * ((A - 1) - (A + 1) * cosW0);
    b2 = A * ((A + 1) - (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha);
    a0 = (A + 1) + (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha;
    a1 = -2 * ((A - 1) + (A + 1) * cosW0);
    a2 = (A + 1) + (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha;
  } else {
    // highshelf
    b0 = A * ((A + 1) + (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha);
    b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
    b2 = A * ((A + 1) + (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha);
    a0 = (A + 1) - (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha;
    a1 = 2 * ((A - 1) - (A + 1) * cosW0);
    a2 = (A + 1) - (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha;
  }

  const w = (2 * Math.PI * f) / fs;
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);

  const numRe = b0 + b1 * cosW + b2 * Math.cos(2 * w);
  const numIm = -(b1 * sinW + b2 * Math.sin(2 * w));
  const denRe = a0 + a1 * cosW + a2 * Math.cos(2 * w);
  const denIm = -(a1 * sinW + a2 * Math.sin(2 * w));

  const numMag2 = numRe * numRe + numIm * numIm;
  const denMag2 = denRe * denRe + denIm * denIm;

  if (denMag2 === 0) return 0;
  return 10 * Math.log10(numMag2 / denMag2);
}

// ─── Coordinate helpers ───────────────────────────────────────────────────────

function freqToX(f: number): number {
  return PAD_L + (Math.log10(f / 20) / Math.log10(1000)) * PLOT_W;
}

function dbToY(db: number): number {
  return PAD_T + ((DB_RANGE - db) / (2 * DB_RANGE)) * PLOT_H;
}

// ─── Build SVG path from dB curve — expensive, must be memoized ──────────────

function buildCurvePaths(bands: Band[]): { linePath: string; areaPath: string } {
  const points = logFreqs.map(f => {
    const db = bands.reduce((sum, band) => sum + biquadResponse(band, f), 0);
    return `${freqToX(f).toFixed(2)},${dbToY(db).toFixed(2)}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const bottomY = dbToY(-DB_RANGE - 1).toFixed(2);
  const startX = freqToX(logFreqs[0]).toFixed(2);
  const endX = freqToX(logFreqs[logFreqs.length - 1]).toFixed(2);
  const areaPath = `M ${startX},${bottomY} L ${points.join(' L ')} L ${endX},${bottomY} Z`;

  return { linePath, areaPath };
}

// ─── Grid labels ──────────────────────────────────────────────────────────────

const H_GRID_DB = [15, 6, 0, -6, -15];
const V_GRID_HZ = [20, 200, 2000, 20000];
const V_GRID_LABELS: Record<number, string> = { 20: '20', 200: '200', 2000: '2k', 20000: '20k' };

// Pre-compute static grid elements (never change)
const GRID_LINES_H = H_GRID_DB.map(db => (
  <line key={db} x1={PAD_L} x2={W - PAD_R} y1={dbToY(db)} y2={dbToY(db)} />
));
const GRID_LINES_V = V_GRID_HZ.map(hz => (
  <line key={hz} x1={freqToX(hz)} x2={freqToX(hz)} y1={PAD_T} y2={H - PAD_B} />
));
const GRID_LABELS_H = H_GRID_DB.map(db => (
  <text key={db} x={PAD_L - 3} y={dbToY(db) + 3} textAnchor="end">{db > 0 ? `+${db}` : db}</text>
));
const GRID_LABELS_V = V_GRID_HZ.map(hz => (
  <text key={hz} x={freqToX(hz)} y={H - 3} textAnchor="middle">{V_GRID_LABELS[hz]}</text>
));

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  state: EQState;
  dispatch: React.Dispatch<EQAction>;
}

export const EQCurve = memo(function EQCurve({ state, dispatch }: Props) {
  const { bands, bypass } = state;
  const [activeDot, setActiveDot] = useState<number | null>(null);

  // Keep bands in a ref so pointer-event callbacks never go stale and don't need recreation
  const bandsRef = useRef(bands);
  bandsRef.current = bands;

  const dragRef = useRef<{ bandIndex: number; startY: number; startGain: number } | null>(null);

  // Expensive path computation — only recompute when band gains actually change
  const { linePath, areaPath } = useMemo(() => buildCurvePaths(bands), [bands]);

  // Dot positions — memoized separately so we don't redo path math on activeDot change
  const dotPositions = useMemo(
    () => bands.map(b => ({ x: freqToX(b.freq), y: dbToY(b.gain), gain: b.gain })),
    [bands]
  );

  const onPointerDown = useCallback((e: React.PointerEvent<SVGCircleElement>, bandIndex: number) => {
    if (bypass) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { bandIndex, startY: e.clientY, startGain: bandsRef.current[bandIndex].gain };
    setActiveDot(bandIndex);
  }, [bypass]);

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const { bandIndex, startY, startGain } = dragRef.current;
    const dbPerPixel = (2 * DB_RANGE) / PLOT_H;
    const deltaDb = -(e.clientY - startY) * dbPerPixel;
    const newGain = Math.max(-DB_RANGE, Math.min(DB_RANGE, startGain + deltaDb));
    dispatch({ type: 'SET_BAND_GAIN', index: bandIndex, gain: parseFloat(newGain.toFixed(1)) });
  }, [dispatch]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    setActiveDot(null);
  }, []);

  const onDblClick = useCallback((bandIndex: number) => {
    if (bypass) return;
    dispatch({ type: 'SET_BAND_GAIN', index: bandIndex, gain: 0 });
  }, [bypass, dispatch]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      style={{ display: 'block' }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Static grid — never re-renders */}
      <g stroke="rgba(0,212,255,0.12)" strokeWidth="0.5">
        {GRID_LINES_H}
        {GRID_LINES_V}
      </g>
      <g fill="rgba(0,212,255,0.45)" fontSize="9" fontFamily="monospace">
        {GRID_LABELS_H}
        {GRID_LABELS_V}
      </g>

      {/* Curve group — dims and locks when bypassed */}
      <g
        data-testid="eq-curve-group"
        opacity={bypass ? '0.2' : '1'}
        pointerEvents={bypass ? 'none' : undefined}
      >
        {/* Filled area */}
        <path
          data-testid="eq-area"
          d={areaPath}
          fill="rgba(0,212,255,0.08)"
          stroke="none"
        />
        {/* Curve line */}
        <path
          data-testid="eq-curve"
          d={linePath}
          fill="none"
          stroke="#00d4ff"
          strokeWidth="1.5"
        />

        {/* Band dots */}
        {dotPositions.map(({ x, y, gain }, i) => {
          const isActive = activeDot === i;
          return (
            <g key={i}>
              {/* Crosshair lines on active dot */}
              {isActive && (
                <>
                  <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="rgba(255,0,60,0.3)" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1={x} x2={x} y1={PAD_T} y2={H - PAD_B} stroke="rgba(255,0,60,0.3)" strokeWidth="0.5" strokeDasharray="3 3" />
                </>
              )}
              <circle
                data-band={i}
                cx={x}
                cy={y}
                r={isActive ? 7 : 5}
                fill={isActive ? '#ff003c' : 'rgba(0,212,255,0.25)'}
                stroke={isActive ? '#ff003c' : '#00d4ff'}
                strokeWidth="1.5"
                style={{ cursor: bypass ? 'default' : 'ns-resize', touchAction: 'none' }}
                onPointerDown={e => onPointerDown(e, i)}
                onDoubleClick={() => onDblClick(i)}
              />
              {isActive && (
                <text
                  x={x}
                  y={y - 11}
                  textAnchor="middle"
                  fill="#00d4ff"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {gain >= 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
});
