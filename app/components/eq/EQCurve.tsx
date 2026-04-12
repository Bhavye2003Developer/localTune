'use client';

import React, {
  useRef, useState, useLayoutEffect, useCallback, useMemo, memo,
} from 'react';
import type { EQState, EQAction, Band } from '../../lib/eqPresets';

// ─── Coordinate constants (in SVG pixel space) ────────────────────────────────

const PAD_L = 36; // room for dB labels
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 26; // room for freq labels
const DB_RANGE = 15;

// ─── Frequency sample array ───────────────────────────────────────────────────

export const logFreqs: number[] = Array.from({ length: 512 }, (_, i) =>
  20 * Math.pow(1000, i / 511)
);

// ─── Coordinate helpers ───────────────────────────────────────────────────────

function freqToX(f: number, w: number): number {
  return PAD_L + (Math.log10(f / 20) / Math.log10(1000)) * (w - PAD_L - PAD_R);
}

function dbToY(db: number, h: number): number {
  return PAD_T + ((DB_RANGE - db) / (2 * DB_RANGE)) * (h - PAD_T - PAD_B);
}

// ─── Biquad transfer function ─────────────────────────────────────────────────

export function biquadResponse(band: Band, f: number): number {
  if (band.gain === 0) return 0;

  const fs = 96000;
  const w0 = (2 * Math.PI * band.freq) / fs;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const A = Math.pow(10, band.gain / 40);
  const alpha = sinW0 / (2 * band.q);

  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;

  if (band.type === 'peaking') {
    b0 = 1 + alpha * A;   b1 = -2 * cosW0; b2 = 1 - alpha * A;
    a0 = 1 + alpha / A;   a1 = -2 * cosW0; a2 = 1 - alpha / A;
  } else if (band.type === 'lowshelf') {
    b0 = A * ((A + 1) - (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha);
    b1 = 2 * A * ((A - 1) - (A + 1) * cosW0);
    b2 = A * ((A + 1) - (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha);
    a0 = (A + 1) + (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha;
    a1 = -2 * ((A - 1) + (A + 1) * cosW0);
    a2 = (A + 1) + (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha;
  } else {
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

// ─── Curve path builder ───────────────────────────────────────────────────────

function buildCurvePaths(bands: Band[], w: number, h: number) {
  const points = logFreqs.map(f => {
    const db = bands.reduce((sum, band) => sum + biquadResponse(band, f), 0);
    return `${freqToX(f, w).toFixed(2)},${dbToY(db, h).toFixed(2)}`;
  });
  const linePath = `M ${points.join(' L ')}`;
  const bottomY = dbToY(-DB_RANGE - 1, h).toFixed(2);
  const startX  = freqToX(logFreqs[0], w).toFixed(2);
  const endX    = freqToX(logFreqs[511], w).toFixed(2);
  const areaPath = `M ${startX},${bottomY} L ${points.join(' L ')} L ${endX},${bottomY} Z`;
  return { linePath, areaPath };
}

// ─── Grid config ──────────────────────────────────────────────────────────────

const H_GRID_DB = [15, 6, 0, -6, -15];
const V_GRID_HZ = [20, 200, 2000, 20000];
const V_GRID_LABELS: Record<number, string> = { 20: '20', 200: '200', 2000: '2k', 20000: '20k' };

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  state: EQState;
  dispatch: React.Dispatch<EQAction>;
}

export const EQCurve = memo(function EQCurve({ state, dispatch }: Props) {
  const { bands, bypass } = state;
  const [activeDot, setActiveDot] = useState<number | null>(null);

  // Observed container dimensions — SVG viewBox matches exactly, so 1 unit = 1 px
  const [dims, setDims] = useState({ w: 800, h: 300 });
  const dimsRef = useRef(dims);
  dimsRef.current = dims;

  const containerRef = useRef<HTMLDivElement>(null);
  const bandsRef     = useRef(bands);
  bandsRef.current   = bands;
  const dragRef      = useRef<{ bandIndex: number; startY: number; startGain: number } | null>(null);

  // Observe container size — skipped in jsdom (no ResizeObserver)
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) setDims({ w: rect.width, h: rect.height });
    return () => ro.disconnect();
  }, []);

  // Grid lines + labels — recalculate only when dims change
  const grid = useMemo(() => {
    const { w, h } = dims;
    return {
      linesH:  H_GRID_DB.map(db => <line key={db} x1={PAD_L} x2={w - PAD_R} y1={dbToY(db, h)} y2={dbToY(db, h)} />),
      linesV:  V_GRID_HZ.map(hz => <line key={hz} x1={freqToX(hz, w)} x2={freqToX(hz, w)} y1={PAD_T} y2={h - PAD_B} />),
      labelsH: H_GRID_DB.map(db => (
        <text key={db} x={PAD_L - 5} y={dbToY(db, h) + 4} textAnchor="end">
          {db > 0 ? `+${db}` : db}
        </text>
      )),
      labelsV: V_GRID_HZ.map(hz => (
        <text key={hz} x={freqToX(hz, w)} y={h - 7} textAnchor="middle">
          {V_GRID_LABELS[hz]}
        </text>
      )),
      zeroY: dbToY(0, h),
    };
  }, [dims]);

  // Curve paths — recalculate on band change or resize
  const { linePath, areaPath } = useMemo(
    () => buildCurvePaths(bands, dims.w, dims.h),
    [bands, dims]
  );

  // Dot positions — separate memo so path doesn't recompute on activeDot change
  const dotPositions = useMemo(
    () => bands.map(b => ({ x: freqToX(b.freq, dims.w), y: dbToY(b.gain, dims.h), gain: b.gain })),
    [bands, dims]
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
    const plotH = dimsRef.current.h - PAD_T - PAD_B;
    const dbPerPixel = (2 * DB_RANGE) / plotH;
    const newGain = Math.max(-DB_RANGE, Math.min(DB_RANGE,
      startGain - (e.clientY - startY) * dbPerPixel
    ));
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
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <svg
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        width="100%"
        height="100%"
        style={{ display: 'block' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* 0 dB reference line — slightly brighter than grid */}
        <line
          x1={PAD_L} x2={dims.w - PAD_R}
          y1={grid.zeroY} y2={grid.zeroY}
          stroke="rgba(245,158,11,0.25)" strokeWidth="1"
        />

        {/* Grid lines */}
        <g stroke="rgba(255,255,255,0.05)" strokeWidth="0.5">
          {grid.linesH}
          {grid.linesV}
        </g>

        {/* Grid labels */}
        <g fill="rgba(255,255,255,0.2)" fontSize="10" fontFamily="monospace">
          {grid.labelsH}
          {grid.labelsV}
        </g>

        {/* Curve group — dims + locks on bypass */}
        <g
          data-testid="eq-curve-group"
          opacity={bypass ? '0.2' : '1'}
          pointerEvents={bypass ? 'none' : undefined}
        >
          <path
            data-testid="eq-area"
            d={areaPath}
            fill="rgba(245,158,11,0.08)"
            stroke="none"
          />
          <path
            data-testid="eq-curve"
            d={linePath}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.5"
          />

          {/* Band dots */}
          {dotPositions.map(({ x, y, gain }, i) => {
            const isActive = activeDot === i;
            return (
              <g key={i}>
                {isActive && (
                  <>
                    <line
                      x1={PAD_L} x2={dims.w - PAD_R} y1={y} y2={y}
                      stroke="rgba(245,158,11,0.3)" strokeWidth="0.5" strokeDasharray="4 4"
                    />
                    <line
                      x1={x} x2={x} y1={PAD_T} y2={dims.h - PAD_B}
                      stroke="rgba(245,158,11,0.3)" strokeWidth="0.5" strokeDasharray="4 4"
                    />
                  </>
                )}
                <circle
                  data-band={i}
                  cx={x} cy={y}
                  r={isActive ? 7 : 5}
                  fill={isActive ? '#F59E0B' : 'rgba(245,158,11,0.15)'}
                  stroke="#F59E0B"
                  strokeWidth="1.5"
                  style={{ cursor: bypass ? 'default' : 'ns-resize', touchAction: 'none' }}
                  onPointerDown={e => onPointerDown(e, i)}
                  onDoubleClick={() => onDblClick(i)}
                />
                {isActive && (
                  <text
                    x={x} y={y - 12}
                    textAnchor="middle"
                    fill="#F59E0B"
                    fontSize="10"
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
    </div>
  );
});
