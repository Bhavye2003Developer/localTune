/**
 * Tests for analysis worker pure logic.
 * The worker itself runs in a separate thread; we test the exported
 * pure functions directly (buildCamelotKey, moodFromFeatures, analyseBuffer).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildCamelotKey,
  moodFromFeatures,
  analyseBuffer,
} from '../app/lib/analysisWorker';

// ─── buildCamelotKey ──────────────────────────────────────────────────────────

describe('buildCamelotKey', () => {
  it('maps C major to 8B', () => {
    expect(buildCamelotKey('C', 'major')).toBe('8B');
  });

  it('maps A minor to 8A', () => {
    expect(buildCamelotKey('A', 'minor')).toBe('8A');
  });

  it('maps G major to 9B', () => {
    expect(buildCamelotKey('G', 'major')).toBe('9B');
  });

  it('maps F# minor to 11A', () => {
    expect(buildCamelotKey('F#', 'minor')).toBe('11A');
  });

  it('maps Bb major to 6B', () => {
    expect(buildCamelotKey('Bb', 'major')).toBe('6B');
  });

  it('returns empty string for unknown key', () => {
    expect(buildCamelotKey('X', 'major')).toBe('');
  });
});

// ─── moodFromFeatures ─────────────────────────────────────────────────────────

describe('moodFromFeatures', () => {
  it('returns Energetic for high energy + high danceability', () => {
    expect(moodFromFeatures(0.9, 0.85, 'major')).toBe('Energetic');
  });

  it('returns Happy for high energy + low danceability + major key', () => {
    expect(moodFromFeatures(0.8, 0.4, 'major')).toBe('Happy');
  });

  it('returns Dark for low energy + minor key', () => {
    expect(moodFromFeatures(0.2, 0.3, 'minor')).toBe('Dark');
  });

  it('returns Chill for moderate energy + major key', () => {
    expect(moodFromFeatures(0.45, 0.5, 'major')).toBe('Chill');
  });

  it('returns Melancholic for moderate energy + minor key', () => {
    expect(moodFromFeatures(0.45, 0.4, 'minor')).toBe('Melancholic');
  });
});

// ─── analyseBuffer ───────────────────────────────────────────────────────────

describe('analyseBuffer', () => {
  const SAMPLE_RATE = 44100;

  function makeMockEssentia(overrides: Record<string, unknown> = {}) {
    return {
      arrayToVector: vi.fn((arr: Float32Array) => arr),
      RhythmExtractor2013: vi.fn(() => ({ bpm: 128.0 })),
      KeyExtractor: vi.fn(() => ({ key: 'C', scale: 'major' })),
      Energy: vi.fn(() => ({ energy: 0.64 })),
      Danceability: vi.fn(() => ({ danceability: 2.1 })),
      LoudnessEBUR128: vi.fn(() => ({ integratedLoudness: -14.2 })),
      ...overrides,
    };
  }

  it('returns correct shape for a valid mono signal', async () => {
    const signal = new Float32Array(SAMPLE_RATE * 10).fill(0.1);
    const essentia = makeMockEssentia();

    const result = await analyseBuffer(signal, signal, SAMPLE_RATE, essentia as never);

    expect(result).toMatchObject({
      bpm: expect.any(Number),
      key: expect.any(String),
      keyScale: expect.any(String),
      camelot: expect.any(String),
      energy: expect.any(Number),
      danceability: expect.any(Number),
      mood: expect.any(String),
      lufs: expect.any(Number),
    });
  });

  it('rounds BPM to one decimal place', async () => {
    const signal = new Float32Array(SAMPLE_RATE).fill(0.1);
    const essentia = makeMockEssentia({
      RhythmExtractor2013: vi.fn(() => ({ bpm: 120.666 })),
    });

    const result = await analyseBuffer(signal, signal, SAMPLE_RATE, essentia as never);

    expect(result.bpm).toBe(120.7);
  });

  it('normalises energy from raw value to 0–1 range', async () => {
    const signal = new Float32Array(SAMPLE_RATE).fill(0.1);
    const essentia = makeMockEssentia({
      Energy: vi.fn(() => ({ energy: 0.36 })), // sqrt(0.36) = 0.6
    });

    const result = await analyseBuffer(signal, signal, SAMPLE_RATE, essentia as never);

    expect(result.energy).toBeGreaterThanOrEqual(0);
    expect(result.energy).toBeLessThanOrEqual(1);
  });

  it('normalises danceability from 0–3 to 0–1', async () => {
    const signal = new Float32Array(SAMPLE_RATE).fill(0.1);
    const essentia = makeMockEssentia({
      Danceability: vi.fn(() => ({ danceability: 3.0 })),
    });

    const result = await analyseBuffer(signal, signal, SAMPLE_RATE, essentia as never);

    expect(result.danceability).toBeCloseTo(1.0, 2);
  });

  it('clamps danceability to 1 when raw value exceeds 3', async () => {
    const signal = new Float32Array(SAMPLE_RATE).fill(0.1);
    const essentia = makeMockEssentia({
      Danceability: vi.fn(() => ({ danceability: 4.5 })),
    });

    const result = await analyseBuffer(signal, signal, SAMPLE_RATE, essentia as never);

    expect(result.danceability).toBe(1);
  });

  it('passes LUFS value through directly', async () => {
    const signal = new Float32Array(SAMPLE_RATE).fill(0.1);
    const essentia = makeMockEssentia({
      LoudnessEBUR128: vi.fn(() => ({ integratedLoudness: -23.1 })),
    });

    const result = await analyseBuffer(signal, signal, SAMPLE_RATE, essentia as never);

    expect(result.lufs).toBeCloseTo(-23.1, 1);
  });

  it('derives camelot key from key + scale', async () => {
    const signal = new Float32Array(SAMPLE_RATE).fill(0.1);
    const essentia = makeMockEssentia({
      KeyExtractor: vi.fn(() => ({ key: 'A', scale: 'minor' })),
    });

    const result = await analyseBuffer(signal, signal, SAMPLE_RATE, essentia as never);

    expect(result.key).toBe('A');
    expect(result.keyScale).toBe('minor');
    expect(result.camelot).toBe('8A');
  });
});
