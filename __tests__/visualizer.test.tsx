import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ─── Mock heavy 3D / postprocessing deps ──────────────────────────────────────

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas">{children}</div>
  ),
  useFrame: vi.fn(),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
}));

vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="effect-composer">{children}</div>
  ),
  Bloom: () => <div data-testid="bloom" />,
}));

vi.mock('three', () => {
  function Color(this: Record<string, unknown>, val?: number | string) {
    this.r = 0; this.g = 0.67; this.b = 1;
    this._val = val;
    this.set = vi.fn();
    this.copy = vi.fn();
  }
  function ShaderMaterial(this: Record<string, unknown>, opts?: Record<string, unknown>) {
    this.uniforms = (opts as { uniforms?: Record<string, unknown> })?.uniforms ?? {
      uTime:         { value: 0 },
      uBass:         { value: 0 },
      uMid:          { value: 0 },
      uKey:          { value: 8 },
      uColor:        { value: new (Color as unknown as new () => Record<string, unknown>)() },
      uColorTint:    { value: new (Color as unknown as new () => Record<string, unknown>)() },
      uTintStrength: { value: 0 },
    };
  }
  function BufferGeometry(this: Record<string, unknown>) {
    this.setAttribute = vi.fn();
  }
  function BufferAttribute(this: Record<string, unknown>, _arr: Float32Array, _itemSize: number) {
    // no-op
  }
  const NormalBlending = 1;
  return { Color, ShaderMaterial, BufferGeometry, BufferAttribute, NormalBlending };
});

vi.mock('../app/lib/audioData', () => ({
  AudioDataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAudioData: () => ({ current: { bass: 0, mid: 0, key: 8 } }),
}));

vi.mock('../app/lib/utils', () => ({
  isIOS: vi.fn().mockReturnValue(false),
  KEY_NAMES: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
}));

// Mock color-thief-browser for VisualizerContainer
vi.mock('color-thief-browser', () => ({
  default: vi.fn().mockImplementation(() => ({
    getColor: vi.fn().mockReturnValue([0, 170, 255]),
  })),
}));

// ─── Import components under test ─────────────────────────────────────────────

import { VisualizerContainer } from '../app/components/visualizer/VisualizerContainer';
import { NebulaScene } from '../app/components/visualizer/NebulaScene';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('VisualizerContainer', () => {
  it('accepts vizMode and coverUrl props without error', () => {
    expect(() => {
      render(<VisualizerContainer vizMode="album-color" coverUrl="test.jpg" />);
    }).not.toThrow();
  });

  it('shows "Album Color" badge when vizMode="album-color"', () => {
    render(<VisualizerContainer vizMode="album-color" coverUrl="test.jpg" />);
    expect(screen.getByText('Album Color')).toBeTruthy();
  });

  it('does NOT show "Album Color" badge when vizMode="nebula"', () => {
    render(<VisualizerContainer vizMode="nebula" coverUrl="test.jpg" />);
    expect(screen.queryByText('Album Color')).toBeNull();
  });
});

describe('NebulaScene', () => {
  it('renders without error', () => {
    expect(() => {
      render(<NebulaScene />);
    }).not.toThrow();
  });
});
