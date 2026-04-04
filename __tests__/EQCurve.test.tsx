import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { EQCurve, biquadResponse, logFreqs } from '../app/components/eq/EQCurve';
import { INITIAL_EQ_STATE } from '../app/lib/eqPresets';
import type { EQAction } from '../app/lib/eqPresets';

// ─── Pure math helpers ────────────────────────────────────────────────────────

describe('logFreqs', () => {
  it('has 512 points', () => {
    expect(logFreqs).toHaveLength(512);
  });
  it('starts near 20 Hz', () => {
    expect(logFreqs[0]).toBeCloseTo(20, 1);
  });
  it('ends near 20000 Hz', () => {
    expect(logFreqs[511]).toBeCloseTo(20000, 0);
  });
});

describe('biquadResponse', () => {
  it('returns 0 dB for peaking with gain=0', () => {
    const band = { freq: 1000, gain: 0, q: 1.4, type: 'peaking' as const };
    expect(biquadResponse(band, 1000)).toBeCloseTo(0, 5);
  });
  it('returns non-zero dB for peaking with gain=6 at center freq', () => {
    const band = { freq: 1000, gain: 6, q: 1.4, type: 'peaking' as const };
    expect(biquadResponse(band, 1000)).toBeGreaterThan(0);
  });
  it('returns 0 dB for lowshelf with gain=0', () => {
    const band = { freq: 32, gain: 0, q: 0.7, type: 'lowshelf' as const };
    expect(biquadResponse(band, 32)).toBeCloseTo(0, 5);
  });
  it('returns 0 dB for highshelf with gain=0', () => {
    const band = { freq: 16000, gain: 0, q: 0.7, type: 'highshelf' as const };
    expect(biquadResponse(band, 16000)).toBeCloseTo(0, 5);
  });
});

// ─── Component rendering ──────────────────────────────────────────────────────

describe('EQCurve component', () => {
  const noop = vi.fn();

  it('renders an SVG element', () => {
    const { container } = render(
      <EQCurve state={INITIAL_EQ_STATE} dispatch={noop} />
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders 10 draggable band dots', () => {
    const { container } = render(
      <EQCurve state={INITIAL_EQ_STATE} dispatch={noop} />
    );
    const circles = container.querySelectorAll('circle[data-band]');
    expect(circles).toHaveLength(10);
  });

  it('dots have r=6 by default', () => {
    const { container } = render(
      <EQCurve state={INITIAL_EQ_STATE} dispatch={noop} />
    );
    const circles = container.querySelectorAll('circle[data-band]');
    circles.forEach(c => expect(c.getAttribute('r')).toBe('6'));
  });

  it('double-click on dot dispatches SET_BAND_GAIN with 0', () => {
    const dispatch = vi.fn();
    const { container } = render(
      <EQCurve state={INITIAL_EQ_STATE} dispatch={dispatch} />
    );
    const dot = container.querySelector('circle[data-band="3"]')!;
    fireEvent.dblClick(dot);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_BAND_GAIN', index: 3, gain: 0 });
  });

  it('curve group is non-interactive and dim in bypass mode', () => {
    const bypassState = { ...INITIAL_EQ_STATE, bypass: true };
    const { container } = render(
      <EQCurve state={bypassState} dispatch={noop} />
    );
    const group = container.querySelector('[data-testid="eq-curve-group"]')!;
    expect(group.getAttribute('opacity')).toBe('0.3');
    expect(group.getAttribute('pointer-events')).toBe('none');
  });

  it('renders filled area path with correct fill', () => {
    const { container } = render(
      <EQCurve state={INITIAL_EQ_STATE} dispatch={noop} />
    );
    const area = container.querySelector('[data-testid="eq-area"]')!;
    expect(area.getAttribute('fill')).toBe('rgba(124,58,237,0.15)');
  });

  it('renders curve path with correct stroke', () => {
    const { container } = render(
      <EQCurve state={INITIAL_EQ_STATE} dispatch={noop} />
    );
    const curve = container.querySelector('[data-testid="eq-curve"]')!;
    expect(curve.getAttribute('stroke')).toBe('#7c3aed');
  });
});
