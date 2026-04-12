/**
 * Analysis Web Worker — BPM / Key / Mood / Energy via essentia.js WASM.
 *
 * Exported pure functions (buildCamelotKey, moodFromFeatures, analyseBuffer)
 * are importable directly for unit tests.
 *
 * Worker protocol:
 *   IN  → { fileId: string; left: Float32Array; right: Float32Array; sampleRate: number }
 *   OUT → { fileId: string; result: AnalysisResult } | { fileId: string; error: string }
 */

import type { AnalysisResult } from '../types/analysis';
export type { AnalysisResult };

// ─── Camelot wheel lookup ────────────────────────────────────────────────────

const CAMELOT_MAJOR: Record<string, string> = {
  'C': '8B', 'G': '9B', 'D': '10B', 'A': '11B', 'E': '12B', 'B': '1B',
  'F#': '2B', 'Gb': '2B', 'Db': '3B', 'C#': '3B', 'Ab': '4B', 'G#': '4B',
  'Eb': '5B', 'D#': '5B', 'Bb': '6B', 'A#': '6B', 'F': '7B',
};

const CAMELOT_MINOR: Record<string, string> = {
  'A': '8A', 'E': '9A', 'B': '10A', 'F#': '11A', 'C#': '12A', 'G#': '1A',
  'Ab': '1A', 'Eb': '2A', 'D#': '2A', 'Bb': '3A', 'A#': '3A', 'F': '4A',
  'C': '5A', 'G': '6A', 'D': '7A',
};

export function buildCamelotKey(key: string, scale: string): string {
  if (scale === 'major') return CAMELOT_MAJOR[key] ?? '';
  if (scale === 'minor') return CAMELOT_MINOR[key] ?? '';
  return '';
}

// ─── Mood heuristic ──────────────────────────────────────────────────────────

export function moodFromFeatures(
  energy: number,
  danceability: number,
  scale: string,
): string {
  if (energy > 0.7 && danceability > 0.7) return 'Energetic';
  if (energy > 0.7 && scale === 'major') return 'Happy';
  if (energy < 0.35 && scale === 'minor') return 'Dark';
  if (energy >= 0.35 && energy <= 0.65 && scale === 'minor') return 'Melancholic';
  return 'Chill';
}

// ─── Core analysis function (testable) ───────────────────────────────────────

interface EssentiaInstance {
  arrayToVector(arr: Float32Array): unknown;
  RhythmExtractor2013(signal: unknown): { bpm: number };
  KeyExtractor(signal: unknown): { key: string; scale: string };
  Energy(signal: unknown): { energy: number };
  Danceability(signal: unknown): { danceability: number };
  LoudnessEBUR128(left: unknown, right: unknown): { integratedLoudness: number };
}

export async function analyseBuffer(
  left: Float32Array,
  right: Float32Array,
  _sampleRate: number,
  essentia: EssentiaInstance,
): Promise<AnalysisResult> {
  const monoVec = essentia.arrayToVector(left);
  const leftVec = essentia.arrayToVector(left);
  const rightVec = essentia.arrayToVector(right);

  const { bpm: rawBpm } = essentia.RhythmExtractor2013(monoVec);
  const { key, scale } = essentia.KeyExtractor(monoVec);
  const { energy: rawEnergy } = essentia.Energy(monoVec);
  const { danceability: rawDance } = essentia.Danceability(monoVec);
  const { integratedLoudness } = essentia.LoudnessEBUR128(leftVec, rightVec);

  const bpm = Math.round(rawBpm * 10) / 10;
  const energy = Math.min(1, Math.sqrt(rawEnergy));
  const danceability = Math.min(1, rawDance / 3);
  const mood = moodFromFeatures(energy, danceability, scale);
  const camelot = buildCamelotKey(key, scale);

  return { bpm, key, keyScale: scale, camelot, energy, danceability, mood, lufs: integratedLoudness };
}

// ─── Worker message handler ───────────────────────────────────────────────────
// Only registers when running as an actual Worker (not imported by tests).

if (typeof self !== 'undefined' && typeof window === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let essentiaInstance: EssentiaInstance | null = null;

  async function getEssentia(): Promise<EssentiaInstance> {
    if (essentiaInstance) return essentiaInstance;
    // Lazy WASM import — never runs on the main thread.
    // locateFile redirects the WASM binary to /public/essentia/ so Turbopack
    // doesn't need to bundle the binary — it's served as a static asset.
    const { EssentiaWASM, Essentia } = await import('essentia.js');
    const wasmModule = await EssentiaWASM({
      locateFile: (filename: string) => '/essentia/' + filename,
    });
    essentiaInstance = new Essentia(wasmModule) as unknown as EssentiaInstance;
    return essentiaInstance;
  }

  self.onmessage = async (
    e: MessageEvent<{ fileId: string; left: Float32Array; right: Float32Array; sampleRate: number }>
  ) => {
    const { fileId, left, right, sampleRate } = e.data;
    try {
      const essentia = await getEssentia();
      const result = await analyseBuffer(left, right, sampleRate, essentia);
      (self as unknown as Worker).postMessage({ fileId, result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AnalysisWorker] failed for', fileId, msg);
      (self as unknown as Worker).postMessage({ fileId, error: msg });
    }
  };
}
