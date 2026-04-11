'use client';

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
let _settings: DSPSettings = { ...DSP_DEFAULTS, stageOrder: [...DSP_DEFAULTS.stageOrder] };
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
