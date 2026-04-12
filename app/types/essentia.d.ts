declare module 'essentia.js' {
  const EssentiaWASM: (options?: { locateFile?: (filename: string) => string }) => Promise<unknown>;
  class Essentia {
    constructor(wasmModule: unknown, isDebug?: boolean);
    arrayToVector(arr: Float32Array): unknown;
    RhythmExtractor2013(signal: unknown, maxTempo?: number, method?: string, minTempo?: number): { bpm: number };
    KeyExtractor(audio: unknown): { key: string; scale: string };
    Energy(array: unknown): { energy: number };
    Danceability(signal: unknown): { danceability: number };
    LoudnessEBUR128(leftSignal: unknown, rightSignal: unknown): { integratedLoudness: number };
  }
  export { EssentiaWASM, Essentia };
}
