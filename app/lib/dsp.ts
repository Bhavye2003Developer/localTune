'use client';

import { INITIAL_BANDS } from './eqPresets';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StageId = 'eq' | 'bassEngine' | 'compressor' | 'stereoWidener' | 'reverb';

export interface DSPSettings {
  stageOrder: StageId[];
  replayGain: { enabled: boolean };
  bassEngine: {
    bypassed: boolean;
    subBass: number;       // dB ±12
    bassShelf: number;     // dB ±12
    compressor: boolean;
    monoBass: boolean;
    harmonicEnhancer: boolean;
  };
  compressor: {
    bypassed: boolean;
    threshold: number;     // dB -60–0
    ratio: number;         // 1–20
    attack: number;        // s 0–1
    release: number;       // s 0–1
    knee: number;          // dB 0–40
    makeupGain: number;    // dB 0–24
  };
  stereoWidener: {
    bypassed: boolean;
    width: number;         // 0–200
  };
  reverb: {
    bypassed: boolean;
    preset: 'Studio' | 'Hall' | 'Church' | 'Outdoor';
    wet: number;           // 0–1
  };
}

export const DSP_DEFAULTS: DSPSettings = {
  stageOrder: ['eq', 'bassEngine', 'compressor', 'stereoWidener', 'reverb'],
  replayGain: { enabled: true },
  bassEngine: {
    bypassed: false,
    subBass: 0,
    bassShelf: 0,
    compressor: false,
    monoBass: false,
    harmonicEnhancer: false,
  },
  compressor: {
    bypassed: false,
    threshold: -24,
    ratio: 3,
    attack: 0.003,
    release: 0.25,
    knee: 30,
    makeupGain: 0,
  },
  stereoWidener: { bypassed: false, width: 100 },
  reverb: { bypassed: false, preset: 'Studio', wet: 0.2 },
};

// ─── Module-level node references ────────────────────────────────────────────
// (populated by initDSP — null until then)

export let replayGainNode: GainNode | null = null;

// EQ (10 BiquadFilterNodes — moved from playerContext)
export let eqNodes: BiquadFilterNode[] = [];
let eqBypassGains: number[] = [];

// Bass Engine
let bassSubBassNode: BiquadFilterNode | null = null;
let bassBassShelfNode: BiquadFilterNode | null = null;
let bassCompNode: DynamicsCompressorNode | null = null;
let bassHarmonicNode: WaveShaperNode | null = null;
let bassMonoSplitter: ChannelSplitterNode | null = null;
let bassMonoMerger: ChannelMergerNode | null = null;
let bassMonoL: GainNode | null = null;
let bassMonoR: GainNode | null = null;
let bassMonoWet: GainNode | null = null;
let bassMonoDry: GainNode | null = null;

// Compressor
let compNode: DynamicsCompressorNode | null = null;
let compMakeupGain: GainNode | null = null;

// Stereo Widener
let widSplitter: ChannelSplitterNode | null = null;
let widMerger: ChannelMergerNode | null = null;
let widLToMid: GainNode | null = null;
let widRToMid: GainNode | null = null;
let widMidSum: GainNode | null = null;
let widLToSide: GainNode | null = null;
let widRNeg: GainNode | null = null;
let widSideSum: GainNode | null = null;
let widSideScale: GainNode | null = null;
let widSideNeg: GainNode | null = null;

// Reverb
let convolverNode: ConvolverNode | null = null;
let reverbWetGain: GainNode | null = null;
let reverbDryPassthrough: GainNode | null = null;
const irCache = new Map<string, AudioBuffer>();

// Limiter
export let limiterNode: DynamicsCompressorNode | null = null;

// Per-stage bypass nodes
const stageIn: Partial<Record<StageId, GainNode>> = {};
const stageOut: Partial<Record<StageId, GainNode>> = {};
const stageWet: Partial<Record<StageId, GainNode>> = {};
const stageDry: Partial<Record<StageId, GainNode>> = {};

let _stageOrder: StageId[] = [...DSP_DEFAULTS.stageOrder];
let _ctx: AudioContext | null = null;
let _settings: DSPSettings = {
  stageOrder: [...DSP_DEFAULTS.stageOrder],
  replayGain: { ...DSP_DEFAULTS.replayGain },
  bassEngine: { ...DSP_DEFAULTS.bassEngine },
  compressor: { ...DSP_DEFAULTS.compressor },
  stereoWidener: { ...DSP_DEFAULTS.stereoWidener },
  reverb: { ...DSP_DEFAULTS.reverb },
};
let _saveTimer: ReturnType<typeof setTimeout> | null = null;

// ─── initDSP ─────────────────────────────────────────────────────────────────

export function initDSP(
  ctx: AudioContext,
  analyserOutput: AudioNode,
  masterGainNode: GainNode,
): void {
  _ctx = ctx;

  // ── ReplayGain ───────────────────────────────────────────────────────────
  replayGainNode = ctx.createGain();
  replayGainNode.gain.value = 1;

  // ── EQ nodes (migrated from playerContext) ───────────────────────────────
  import_eqNodes(ctx);

  // ── Bass Engine nodes ─────────────────────────────────────────────────────
  bassSubBassNode  = ctx.createBiquadFilter();
  bassSubBassNode.type = 'lowshelf';
  bassSubBassNode.frequency.value = 40;
  bassSubBassNode.gain.value = 0;

  bassBassShelfNode = ctx.createBiquadFilter();
  bassBassShelfNode.type = 'lowshelf';
  bassBassShelfNode.frequency.value = 80;
  bassBassShelfNode.gain.value = 0;

  bassCompNode = ctx.createDynamicsCompressor();
  bassCompNode.threshold.value = -24;
  bassCompNode.ratio.value = 4;
  bassCompNode.attack.value = 0.003;
  bassCompNode.release.value = 0.25;
  bassCompNode.knee.value = 30;

  bassHarmonicNode = ctx.createWaveShaper();
  bassHarmonicNode.curve = null; // disabled by default
  bassHarmonicNode.oversample = '4x';

  bassMonoSplitter = ctx.createChannelSplitter(2);
  bassMonoMerger   = ctx.createChannelMerger(2);
  bassMonoL = ctx.createGain(); bassMonoL.gain.value = 0.5;
  bassMonoR = ctx.createGain(); bassMonoR.gain.value = 0.5;
  bassMonoWet = ctx.createGain(); bassMonoWet.gain.value = 0; // mono bass off by default
  bassMonoDry = ctx.createGain(); bassMonoDry.gain.value = 1;

  // ── Compressor nodes ──────────────────────────────────────────────────────
  compNode = ctx.createDynamicsCompressor();
  compNode.threshold.value = _settings.compressor.threshold;
  compNode.ratio.value     = _settings.compressor.ratio;
  compNode.attack.value    = _settings.compressor.attack;
  compNode.release.value   = _settings.compressor.release;
  compNode.knee.value      = _settings.compressor.knee;
  compMakeupGain = ctx.createGain();
  compMakeupGain.gain.value = dbToLinear(_settings.compressor.makeupGain);

  // ── Stereo Widener nodes ──────────────────────────────────────────────────
  widSplitter = ctx.createChannelSplitter(2);
  widMerger   = ctx.createChannelMerger(2);
  widLToMid   = ctx.createGain(); widLToMid.gain.value   =  0.5;
  widRToMid   = ctx.createGain(); widRToMid.gain.value   =  0.5;
  widMidSum   = ctx.createGain(); widMidSum.gain.value   =  1;
  widLToSide  = ctx.createGain(); widLToSide.gain.value  =  0.5;
  widRNeg     = ctx.createGain(); widRNeg.gain.value     = -0.5;
  widSideSum  = ctx.createGain(); widSideSum.gain.value  =  1;
  widSideScale= ctx.createGain(); widSideScale.gain.value = 1; // width/100
  widSideNeg  = ctx.createGain(); widSideNeg.gain.value  = -1;

  // ── Reverb nodes ──────────────────────────────────────────────────────────
  convolverNode      = ctx.createConvolver();
  reverbWetGain      = ctx.createGain(); reverbWetGain.gain.value      = _settings.reverb.wet;
  reverbDryPassthrough = ctx.createGain(); reverbDryPassthrough.gain.value = 1 - _settings.reverb.wet;

  // ── Limiter ───────────────────────────────────────────────────────────────
  limiterNode = ctx.createDynamicsCompressor();
  limiterNode.threshold.value = -0.1;
  limiterNode.ratio.value     = 20;
  limiterNode.attack.value    = 0.001;
  limiterNode.release.value   = 0.1;
  limiterNode.knee.value      = 0;

  // ── Create per-stage input/output/wet/dry GainNodes ───────────────────────
  const stages: StageId[] = ['eq', 'bassEngine', 'compressor', 'stereoWidener', 'reverb'];
  for (const id of stages) {
    stageIn[id]  = ctx.createGain(); stageIn[id]!.gain.value  = 1;
    stageOut[id] = ctx.createGain(); stageOut[id]!.gain.value = 1;
    stageWet[id] = ctx.createGain(); stageWet[id]!.gain.value = 1;
    stageDry[id] = ctx.createGain(); stageDry[id]!.gain.value = 0;
  }

  // ── Wire effect internals for each stage ──────────────────────────────────
  wireEQInternals();
  wireBassEngineInternals();
  wireCompressorInternals();
  wireStereoWidenerInternals();
  wireReverbInternals();

  // ── Wire full chain ───────────────────────────────────────────────────────
  analyserOutput.connect(replayGainNode);
  wireStageChain(_settings.stageOrder);
  limiterNode.connect(masterGainNode);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

function import_eqNodes(ctx: AudioContext): void {
  eqNodes = INITIAL_BANDS.map(band => {
    const node = ctx.createBiquadFilter();
    node.type = band.type;
    node.frequency.value = band.freq;
    node.Q.value = band.q;
    node.gain.value = 0;
    return node;
  });
  eqBypassGains = eqNodes.map(() => 0);
}

function wireEQInternals(): void {
  const si = stageIn.eq!;
  const sw = stageWet.eq!;
  const sd = stageDry.eq!;
  const so = stageOut.eq!;
  si.connect(eqNodes[0]);
  for (let i = 0; i < eqNodes.length - 1; i++) eqNodes[i].connect(eqNodes[i + 1]);
  eqNodes[eqNodes.length - 1].connect(sw);
  si.connect(sd);
  sw.connect(so);
  sd.connect(so);
}

function wireBassEngineInternals(): void {
  const si = stageIn.bassEngine!;
  const sw = stageWet.bassEngine!;
  const sd = stageDry.bassEngine!;
  const so = stageOut.bassEngine!;

  // Main effect chain: si → subBass → bassShelf → bassComp → harmonic → mono bypass → sw
  si.connect(bassSubBassNode!);
  bassSubBassNode!.connect(bassBassShelfNode!);
  bassBassShelfNode!.connect(bassCompNode!);
  bassCompNode!.connect(bassHarmonicNode!);

  // Mono bass bypass around harmonic output
  bassHarmonicNode!.connect(bassMonoDry!);
  bassHarmonicNode!.connect(bassMonoSplitter!);
  bassMonoSplitter!.connect(bassMonoL!, 0);
  bassMonoSplitter!.connect(bassMonoR!, 1);
  bassMonoL!.connect(bassMonoMerger!, 0, 0);
  bassMonoL!.connect(bassMonoMerger!, 0, 1);
  bassMonoR!.connect(bassMonoMerger!, 0, 0);
  bassMonoR!.connect(bassMonoMerger!, 0, 1);
  bassMonoMerger!.connect(bassMonoWet!);

  bassMonoWet!.connect(sw);
  bassMonoDry!.connect(sw);

  si.connect(sd);
  sw.connect(so);
  sd.connect(so);
}

function wireCompressorInternals(): void {
  const si = stageIn.compressor!;
  const sw = stageWet.compressor!;
  const sd = stageDry.compressor!;
  const so = stageOut.compressor!;
  si.connect(compNode!);
  compNode!.connect(compMakeupGain!);
  compMakeupGain!.connect(sw);
  si.connect(sd);
  sw.connect(so);
  sd.connect(so);
}

function wireStereoWidenerInternals(): void {
  const si = stageIn.stereoWidener!;
  const sw = stageWet.stereoWidener!;
  const sd = stageDry.stereoWidener!;
  const so = stageOut.stereoWidener!;

  // M-S encode: Mid = (L+R)*0.5, Side = (L-R)*0.5
  si.connect(widSplitter!);
  widSplitter!.connect(widLToMid!,  0);
  widSplitter!.connect(widRToMid!,  1);
  widLToMid!.connect(widMidSum!);
  widRToMid!.connect(widMidSum!);
  widSplitter!.connect(widLToSide!, 0);
  widSplitter!.connect(widRNeg!,    1);
  widLToSide!.connect(widSideSum!);
  widRNeg!.connect(widSideSum!);
  // Scale side by width factor
  widSideSum!.connect(widSideScale!);
  // Reconstruct: L = Mid + ScaledSide, R = Mid - ScaledSide
  widMidSum!.connect(widMerger!, 0, 0);
  widMidSum!.connect(widMerger!, 0, 1);
  widSideScale!.connect(widMerger!, 0, 0);
  widSideScale!.connect(widSideNeg!);
  widSideNeg!.connect(widMerger!, 0, 1);
  widMerger!.connect(sw);

  si.connect(sd);
  sw.connect(so);
  sd.connect(so);
}

function wireReverbInternals(): void {
  const si = stageIn.reverb!;
  const sw = stageWet.reverb!;
  const sd = stageDry.reverb!;
  const so = stageOut.reverb!;
  si.connect(convolverNode!);
  convolverNode!.connect(reverbWetGain!);
  si.connect(reverbDryPassthrough!);
  reverbWetGain!.connect(sw);
  reverbDryPassthrough!.connect(sw);
  si.connect(sd);
  sw.connect(so);
  sd.connect(so);
}

function wireStageChain(order: StageId[]): void {
  replayGainNode!.connect(stageIn[order[0]]!);
  for (let i = 0; i < order.length - 1; i++) {
    stageOut[order[i]]!.connect(stageIn[order[i + 1]]!);
  }
  stageOut[order[order.length - 1]]!.connect(limiterNode!);
}

function scheduleSave(): void {
  // persistence wired in Task 5
}

// ─── Bypass ───────────────────────────────────────────────────────────────────

const _bypassed: Partial<Record<StageId, boolean>> = {};

export function setStageBypass(stage: StageId, bypassed: boolean): void {
  _bypassed[stage] = bypassed;
  if (stageWet[stage]) stageWet[stage]!.gain.value = bypassed ? 0 : 1;
  if (stageDry[stage]) stageDry[stage]!.gain.value = bypassed ? 1 : 0;
  scheduleSave();
}

export function getStageBypass(stage: StageId): boolean {
  return _bypassed[stage] ?? false;
}

// ─── Rewire ───────────────────────────────────────────────────────────────────

export function rewireDSPChain(newOrder: StageId[]): void {
  if (!replayGainNode || !limiterNode) return;

  // Disconnect current chain
  replayGainNode.disconnect();
  for (const id of _stageOrder) {
    if (stageOut[id]) stageOut[id]!.disconnect();
  }

  // Reconnect in new order
  _stageOrder = [...newOrder];
  wireStageChain(_stageOrder);
  scheduleSave();
}

export function getStageOrder(): StageId[] {
  return [..._stageOrder];
}

// ─── ReplayGain ───────────────────────────────────────────────────────────────

export function setReplayGain(tagValue: string | null | undefined): void {
  if (!replayGainNode) return;
  if (!tagValue) { replayGainNode.gain.value = 1; return; }
  const match = tagValue.match(/^([+-]?\d+(?:\.\d+)?)\s*dB$/i);
  if (!match) { replayGainNode.gain.value = 1; return; }
  replayGainNode.gain.value = dbToLinear(parseFloat(match[1]));
}

// ─── EQ (same API as before, now in dsp.ts) ───────────────────────────────────

export function setEQBandGain(index: number, gainDb: number): void {
  if (eqNodes[index]) eqNodes[index].gain.value = gainDb;
}

export function setEQBypass(on: boolean): void {
  setStageBypass('eq', on);
}

// ─── Bass Engine ──────────────────────────────────────────────────────────────

export function setBassSubBass(db: number): void {
  if (bassSubBassNode) bassSubBassNode.gain.value = db;
  _settings.bassEngine.subBass = db;
  scheduleSave();
}

export function setBassShelf(db: number): void {
  if (bassBassShelfNode) bassBassShelfNode.gain.value = db;
  _settings.bassEngine.bassShelf = db;
  scheduleSave();
}

export function setBassCompressorEnabled(enabled: boolean): void {
  if (!bassCompNode) return;
  if (enabled) {
    bassCompNode.threshold.value = -24;
    bassCompNode.ratio.value = 4;
  } else {
    bassCompNode.threshold.value = 0;
    bassCompNode.ratio.value = 1;
  }
  _settings.bassEngine.compressor = enabled;
  scheduleSave();
}

export function setBassMonoBass(enabled: boolean): void {
  if (bassMonoWet) bassMonoWet.gain.value = enabled ? 1 : 0;
  if (bassMonoDry) bassMonoDry.gain.value = enabled ? 0 : 1;
  _settings.bassEngine.monoBass = enabled;
  scheduleSave();
}

export function setBassHarmonicEnhancer(enabled: boolean): void {
  if (!bassHarmonicNode) return;
  if (enabled) {
    const n = 256;
    const curve = new Float32Array(n);
    const amount = 200;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    bassHarmonicNode.curve = curve;
  } else {
    bassHarmonicNode.curve = null;
  }
  _settings.bassEngine.harmonicEnhancer = enabled;
  scheduleSave();
}

// ─── Compressor ───────────────────────────────────────────────────────────────

export function setCompressorThreshold(db: number): void {
  if (compNode) compNode.threshold.value = db;
  _settings.compressor.threshold = db;
  scheduleSave();
}

export function setCompressorRatio(ratio: number): void {
  if (compNode) compNode.ratio.value = ratio;
  _settings.compressor.ratio = ratio;
  scheduleSave();
}

export function setCompressorAttack(s: number): void {
  if (compNode) compNode.attack.value = s;
  _settings.compressor.attack = s;
  scheduleSave();
}

export function setCompressorRelease(s: number): void {
  if (compNode) compNode.release.value = s;
  _settings.compressor.release = s;
  scheduleSave();
}

export function setCompressorKnee(db: number): void {
  if (compNode) compNode.knee.value = db;
  _settings.compressor.knee = db;
  scheduleSave();
}

export function setCompressorMakeupGain(db: number): void {
  if (compMakeupGain) compMakeupGain.gain.value = dbToLinear(db);
  _settings.compressor.makeupGain = db;
  scheduleSave();
}

export function getCompressorReduction(): number {
  return compNode?.reduction ?? 0;
}

// ─── Stereo Widener ───────────────────────────────────────────────────────────

let _stereoWidth = 100;

export function setStereoWidth(width: number): void {
  _stereoWidth = width;
  if (widSideScale) widSideScale.gain.value = width / 100;
  _settings.stereoWidener.width = width;
  scheduleSave();
}

export function getStereoWidth(): number {
  return _stereoWidth;
}

// ─── Reverb ───────────────────────────────────────────────────────────────────

export function setReverbWet(wet: number): void {
  if (reverbWetGain)      reverbWetGain.gain.value      = wet;
  if (reverbDryPassthrough) reverbDryPassthrough.gain.value = 1 - wet;
  _settings.reverb.wet = wet;
  scheduleSave();
}

export async function setReverbPreset(preset: DSPSettings['reverb']['preset']): Promise<void> {
  if (!_ctx || !convolverNode) return;
  _settings.reverb.preset = preset;

  if (!irCache.has(preset)) {
    try {
      const res = await fetch(`/ir/${preset}.wav`);
      const buf = await res.arrayBuffer();
      const decoded = await _ctx.decodeAudioData(buf);
      irCache.set(preset, decoded);
    } catch {
      return; // IR load failed — keep existing buffer
    }
  }

  convolverNode.buffer = irCache.get(preset) ?? null;
  scheduleSave();
}

export function getIRCache(): Map<string, AudioBuffer> {
  return irCache;
}
