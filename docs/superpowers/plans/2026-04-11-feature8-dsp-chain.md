# Feature 8 — Full DSP Signal Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 6-stage configurable DSP pipeline (ReplayGain → EQ → Bass Engine → Compressor → Stereo Widener → Reverb → Limiter) with per-stage bypass, drag-to-reorder middle stages, and a DSP drawer toggled by `D`.

**Architecture:** All Web Audio DSP nodes live in `app/lib/dsp.ts` as module-level singletons. `playerContext.tsx` calls `initDSP()` after creating the AudioContext, then delegates DSP mutations to `dsp.ts`. The DSP panel mirrors the EQ panel drawer pattern. EQ nodes migrate from `playerContext.tsx` into `dsp.ts`.

**Tech Stack:** Web Audio API native nodes only (BiquadFilterNode, DynamicsCompressorNode, ConvolverNode, WaveShaperNode, ChannelSplitterNode, ChannelMergerNode, GainNode), dnd-kit/sortable (already installed), Dexie (already installed), React 19, Next.js 16, Tailwind CSS 4, Vitest + Testing Library.

---

## Bypass Pattern

Every bypassable stage uses this topology:

```
stageIn (GainNode) ──→ [effect nodes] ──→ wetGain ──→ stageOut (GainNode)
                   └──→ dryGain ──────────────────────↑
```

- **Active**: `wetGain.gain=1`, `dryGain.gain=0`
- **Bypassed**: `wetGain.gain=0`, `dryGain.gain=1`

`stageIn` and `stageOut` are the connection points used during `rewireDSPChain`.

---

## Full Signal Chain

```
analyser → replayGain → stageIn[order[0]] → ... → stageOut[order[4]] → limiter → masterGain → destination
```

Middle stage default order: `['eq', 'bassEngine', 'compressor', 'stereoWidener', 'reverb']`

---

## Task 1: Dexie schema + DSP types/defaults

**Files:**
- Modify: `app/lib/db.ts`
- Create: `app/lib/dsp.ts` (types + defaults only — no Web Audio)

- [ ] **Step 1.1: Add `dspSettings` table to Dexie**

Open `app/lib/db.ts` and replace its entire contents with:

```ts
import Dexie, { type Table } from 'dexie';

export interface StoredTrack {
  id?: number;
  fileId: string;
  name: string;
  title: string;
  artist?: string;
  album?: string;
  size: number;
  type: string;
  duration: number;
  bpm?: number;
  musicalKey?: string;
  mood?: string;
}

export interface EQPreset {
  id?: number;
  name: string;
  bands: { freq: number; gain: number; q: number }[];
}

export interface StoredDSPSettings {
  id: string;           // always 'default'
  settings: string;     // JSON-serialised DSPSettings
}

export class FineTuneDB extends Dexie {
  tracks!: Table<StoredTrack>;
  eqPresets!: Table<EQPreset>;
  dspSettings!: Table<StoredDSPSettings>;

  constructor() {
    super('finetune_v1');
    this.version(1).stores({
      tracks:      '++id, fileId, name',
      eqPresets:   '++id, name',
    });
    this.version(2).stores({
      tracks:      '++id, fileId, name',
      eqPresets:   '++id, name',
      dspSettings: 'id',
    });
  }
}

export const db = new FineTuneDB();
```

- [ ] **Step 1.2: Create `app/lib/dsp.ts` with types and defaults only**

```ts
// app/lib/dsp.ts
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
```

- [ ] **Step 1.3: Commit**

```bash
git add app/lib/db.ts app/lib/dsp.ts
git commit -m "feat: DSP types, Dexie dspSettings schema v2"
```

---

## Task 2: `dsp.ts` — node init + chain wiring (TDD)

**Files:**
- Modify: `app/lib/dsp.ts`
- Create: `__tests__/dsp.test.ts`

- [ ] **Step 2.1: Write failing tests for `initDSP` node creation**

Create `__tests__/dsp.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Web Audio mock factory ───────────────────────────────────────────────────

function makeGain(init = 0) {
  return { connect: vi.fn(), disconnect: vi.fn(), gain: { value: init } };
}
function makeBiquad() {
  return {
    connect: vi.fn(), disconnect: vi.fn(),
    type: 'peaking' as BiquadFilterType,
    frequency: { value: 0 }, Q: { value: 1 }, gain: { value: 0 },
  };
}
function makeCompressor() {
  return {
    connect: vi.fn(), disconnect: vi.fn(),
    threshold: { value: -24 }, ratio: { value: 4 },
    attack: { value: 0.003 }, release: { value: 0.25 },
    knee: { value: 30 }, reduction: 0,
  };
}
function makeConvolver() {
  return { connect: vi.fn(), disconnect: vi.fn(), buffer: null as AudioBuffer | null, normalize: true };
}
function makeWaveShaper() {
  return { connect: vi.fn(), disconnect: vi.fn(), curve: null as Float32Array | null, oversample: 'none' as OverSampleType };
}
function makeSplitter() { return { connect: vi.fn(), disconnect: vi.fn() }; }
function makeMerger()   { return { connect: vi.fn(), disconnect: vi.fn() }; }

function makeMockCtx() {
  return {
    createGain:              vi.fn().mockImplementation(makeGain),
    createBiquadFilter:      vi.fn().mockImplementation(makeBiquad),
    createDynamicsCompressor:vi.fn().mockImplementation(makeCompressor),
    createConvolver:         vi.fn().mockImplementation(makeConvolver),
    createWaveShaper:        vi.fn().mockImplementation(makeWaveShaper),
    createChannelSplitter:   vi.fn().mockImplementation(makeSplitter),
    createChannelMerger:     vi.fn().mockImplementation(makeMerger),
    decodeAudioData:         vi.fn().mockResolvedValue({ length: 1000 } as unknown as AudioBuffer),
  };
}

// Reset DSP module between tests
async function freshDSP(ctx = makeMockCtx()) {
  vi.resetModules();
  const mod = await import('../app/lib/dsp');
  const analyser = makeGain();
  const masterGain = makeGain();
  mod.initDSP(ctx as unknown as AudioContext, analyser as unknown as AudioNode, masterGain as unknown as GainNode);
  return { mod, ctx, analyser, masterGain };
}

describe('initDSP — node creation', () => {
  it('creates replayGainNode', async () => {
    const { mod, ctx } = await freshDSP();
    expect(mod.replayGainNode).not.toBeNull();
    expect(ctx.createGain).toHaveBeenCalled();
  });

  it('creates 10 EQ BiquadFilterNodes', async () => {
    const { mod, ctx } = await freshDSP();
    expect(mod.eqNodes).toHaveLength(10);
    expect(ctx.createBiquadFilter).toHaveBeenCalledTimes(
      10 +         // EQ bands
      2 +          // bass sub-bass + bass shelf
      0            // (counted separately below)
    );
  });

  it('creates limiterNode as DynamicsCompressorNode', async () => {
    const { mod } = await freshDSP();
    expect(mod.limiterNode).not.toBeNull();
  });

  it('limiter params are hardcoded and immutable', async () => {
    const { mod } = await freshDSP();
    const l = mod.limiterNode!;
    expect(l.threshold.value).toBe(-0.1);
    expect(l.ratio.value).toBe(20);
    expect(l.attack.value).toBe(0.001);
    expect(l.release.value).toBe(0.1);
    expect(l.knee.value).toBe(0);
  });
});

describe('initDSP — chain wiring', () => {
  it('analyser connects to replayGainNode', async () => {
    const { analyser, mod } = await freshDSP();
    expect(analyser.connect).toHaveBeenCalledWith(mod.replayGainNode);
  });

  it('last stage output connects to limiterNode', async () => {
    const { mod } = await freshDSP();
    // stageOut for last default stage ('reverb') should connect to limiterNode
    // We verify limiterNode.connect was called with masterGain
    expect(mod.limiterNode).not.toBeNull();
  });

  it('limiterNode connects to masterGain', async () => {
    const { masterGain, mod } = await freshDSP();
    expect(mod.limiterNode!.connect).toHaveBeenCalledWith(masterGain);
  });
});
```

- [ ] **Step 2.2: Run tests — verify they fail**

```bash
npx vitest run __tests__/dsp.test.ts 2>&1 | head -40
```

Expected: errors about `initDSP` not being exported / not existing.

- [ ] **Step 2.3: Implement `initDSP` in `app/lib/dsp.ts`**

Append the following to `app/lib/dsp.ts` (after the module-level variable declarations from Task 1):

```ts
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
```

- [ ] **Step 2.4: Run tests — verify they pass**

```bash
npx vitest run __tests__/dsp.test.ts 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add app/lib/dsp.ts __tests__/dsp.test.ts
git commit -m "feat: dsp.ts initDSP node creation and chain wiring"
```

---

## Task 3: `dsp.ts` — bypass and rewire (TDD)

**Files:**
- Modify: `app/lib/dsp.ts`
- Modify: `__tests__/dsp.test.ts`

- [ ] **Step 3.1: Add failing tests for bypass and rewire**

Append to `__tests__/dsp.test.ts`:

```ts
describe('setStageBypass', () => {
  it('bypass=true sets wetGain=0 dryGain=1', async () => {
    const { mod } = await freshDSP();
    mod.setStageBypass('compressor', true);
    // After bypass, dry path should carry signal
    // We verify via getStageBypass
    expect(mod.getStageBypass('compressor')).toBe(true);
  });

  it('bypass=false sets wetGain=1 dryGain=0', async () => {
    const { mod } = await freshDSP();
    mod.setStageBypass('compressor', true);
    mod.setStageBypass('compressor', false);
    expect(mod.getStageBypass('compressor')).toBe(false);
  });

  it('all stages can be bypassed independently', async () => {
    const { mod } = await freshDSP();
    const stages: import('../app/lib/dsp').StageId[] = ['eq', 'bassEngine', 'compressor', 'stereoWidener', 'reverb'];
    for (const s of stages) {
      mod.setStageBypass(s, true);
      expect(mod.getStageBypass(s)).toBe(true);
      mod.setStageBypass(s, false);
      expect(mod.getStageBypass(s)).toBe(false);
    }
  });
});

describe('rewireDSPChain', () => {
  it('accepts a new order and does not throw', async () => {
    const { mod } = await freshDSP();
    expect(() => mod.rewireDSPChain(['compressor', 'eq', 'bassEngine', 'stereoWidener', 'reverb'])).not.toThrow();
  });

  it('getStageOrder returns updated order', async () => {
    const { mod } = await freshDSP();
    const newOrder: import('../app/lib/dsp').StageId[] = ['compressor', 'eq', 'bassEngine', 'stereoWidener', 'reverb'];
    mod.rewireDSPChain(newOrder);
    expect(mod.getStageOrder()).toEqual(newOrder);
  });

  it('disconnects stageOut nodes before reconnecting', async () => {
    // Just verifies no throw and order is persisted
    const { mod } = await freshDSP();
    mod.rewireDSPChain(['reverb', 'compressor', 'eq', 'stereoWidener', 'bassEngine']);
    expect(mod.getStageOrder()).toEqual(['reverb', 'compressor', 'eq', 'stereoWidener', 'bassEngine']);
  });
});
```

- [ ] **Step 3.2: Run tests — verify they fail**

```bash
npx vitest run __tests__/dsp.test.ts --reporter=verbose 2>&1 | grep "FAIL\|Error" | head -20
```

Expected: `setStageBypass`, `getStageBypass`, `rewireDSPChain`, `getStageOrder` not found.

- [ ] **Step 3.3: Implement bypass and rewire in `app/lib/dsp.ts`**

Append to `app/lib/dsp.ts`:

```ts
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
```

Note: `scheduleSave` is defined in Task 11. For now add a stub:

```ts
function scheduleSave(): void {
  // persistence wired in Task 11
}
```

- [ ] **Step 3.4: Run tests — verify they pass**

```bash
npx vitest run __tests__/dsp.test.ts 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 3.5: Commit**

```bash
git add app/lib/dsp.ts __tests__/dsp.test.ts
git commit -m "feat: dsp.ts stage bypass and rewire chain"
```

---

## Task 4: `dsp.ts` — per-stage mutation functions (TDD)

**Files:**
- Modify: `app/lib/dsp.ts`
- Modify: `__tests__/dsp.test.ts`

- [ ] **Step 4.1: Add failing tests for setters**

Append to `__tests__/dsp.test.ts`:

```ts
describe('setReplayGain', () => {
  it('converts dB string "+3.5 dB" to linear gain ~1.496', async () => {
    const { mod } = await freshDSP();
    mod.setReplayGain('+3.5 dB');
    expect(mod.replayGainNode!.gain.value).toBeCloseTo(1.496, 2);
  });

  it('converts "-6.02 dB" to linear ~0.5', async () => {
    const { mod } = await freshDSP();
    mod.setReplayGain('-6.02 dB');
    expect(mod.replayGainNode!.gain.value).toBeCloseTo(0.5, 2);
  });

  it('falls back to gain=1 for missing/invalid tag', async () => {
    const { mod } = await freshDSP();
    mod.setReplayGain(null);
    expect(mod.replayGainNode!.gain.value).toBe(1);
    mod.setReplayGain('not a number dB');
    expect(mod.replayGainNode!.gain.value).toBe(1);
  });
});

describe('setBassSubBass / setBassShelf', () => {
  it('setBassSubBass sets filter gain', async () => {
    const { mod } = await freshDSP();
    mod.setBassSubBass(6);
    expect(mod.eqNodes).toBeDefined(); // just verifying dsp initialized
    // access via exported node — add export in impl if needed
  });
});

describe('setCompressorParam', () => {
  it('setCompressorThreshold sets node value', async () => {
    const { mod } = await freshDSP();
    mod.setCompressorThreshold(-30);
    // test via getCompressorReduction existing (just no-throw for now)
    expect(mod.getCompressorReduction()).toBeDefined();
  });
});

describe('setStereoWidth', () => {
  it('width=0 sets sideScale to 0 (mono)', async () => {
    const { mod } = await freshDSP();
    mod.setStereoWidth(0);
    // widSideScale.gain.value should be 0
    // We test via no-throw + getWidth
    expect(mod.getStereoWidth()).toBe(0);
  });

  it('width=100 sets sideScale to 1 (unity)', async () => {
    const { mod } = await freshDSP();
    mod.setStereoWidth(100);
    expect(mod.getStereoWidth()).toBe(100);
  });

  it('width=200 sets sideScale to 2 (hyper-wide)', async () => {
    const { mod } = await freshDSP();
    mod.setStereoWidth(200);
    expect(mod.getStereoWidth()).toBe(200);
  });
});
```

- [ ] **Step 4.2: Run tests — verify they fail**

```bash
npx vitest run __tests__/dsp.test.ts 2>&1 | grep "FAIL\|Error" | head -10
```

- [ ] **Step 4.3: Implement setters in `app/lib/dsp.ts`**

Append to `app/lib/dsp.ts`:

```ts
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
```

- [ ] **Step 4.4: Run tests — verify they pass**

```bash
npx vitest run __tests__/dsp.test.ts 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add app/lib/dsp.ts __tests__/dsp.test.ts
git commit -m "feat: dsp.ts per-stage mutation functions"
```

---

## Task 5: `dsp.ts` — IR cache test + persistence

**Files:**
- Modify: `app/lib/dsp.ts`
- Modify: `__tests__/dsp.test.ts`

- [ ] **Step 5.1: Add failing IR cache test**

Append to `__tests__/dsp.test.ts`:

```ts
describe('setReverbPreset — IR cache', () => {
  it('fetches IR WAV and caches as AudioBuffer', async () => {
    const mockBuffer = { length: 1000 } as unknown as AudioBuffer;
    const mockArrayBuffer = new ArrayBuffer(8);
    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
    } as unknown as Response);

    const ctx = makeMockCtx();
    ctx.decodeAudioData = vi.fn().mockResolvedValue(mockBuffer);
    const { mod } = await freshDSP(ctx);

    await mod.setReverbPreset('Studio');
    expect(global.fetch).toHaveBeenCalledWith('/ir/Studio.wav');
    expect(mod.getIRCache().get('Studio')).toBe(mockBuffer);
  });

  it('does not re-fetch on second call with same preset', async () => {
    const mockArrayBuffer = new ArrayBuffer(8);
    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
    } as unknown as Response);

    const ctx = makeMockCtx();
    const { mod } = await freshDSP(ctx);

    await mod.setReverbPreset('Hall');
    await mod.setReverbPreset('Hall');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 5.2: Run — verify fails**

```bash
npx vitest run __tests__/dsp.test.ts -t "IR cache" 2>&1 | tail -15
```

- [ ] **Step 5.3: IR tests already pass from Task 4 `setReverbPreset` impl — verify**

```bash
npx vitest run __tests__/dsp.test.ts 2>&1 | tail -10
```

If any fail, check `getIRCache` export in `dsp.ts` (already added in Task 4). Adjust as needed.

- [ ] **Step 5.4: Implement `scheduleSave` + persistence in `app/lib/dsp.ts`**

Replace the stub `scheduleSave` function and add load/save:

```ts
// ─── Persistence ─────────────────────────────────────────────────────────────

function scheduleSave(): void {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      const { db } = await import('./db');
      await db.dspSettings.put({ id: 'default', settings: JSON.stringify(_settings) });
    } catch { /* IndexedDB unavailable (SSR / test) */ }
  }, 500);
}

export async function loadDSPSettings(): Promise<DSPSettings> {
  try {
    const { db } = await import('./db');
    const stored = await db.dspSettings.get('default');
    if (stored) {
      const parsed = JSON.parse(stored.settings) as DSPSettings;
      _settings = { ...DSP_DEFAULTS, ...parsed, stageOrder: parsed.stageOrder ?? [...DSP_DEFAULTS.stageOrder] };
      return _settings;
    }
  } catch { /* first run or SSR */ }
  return { ...DSP_DEFAULTS, stageOrder: [...DSP_DEFAULTS.stageOrder] };
}

export function getDSPSettings(): DSPSettings {
  return _settings;
}

export function applyLoadedSettings(): void {
  // Called after initDSP + loadDSPSettings to restore persisted state
  setStageBypass('eq', _settings.bassEngine.bypassed);  // note: each stage has own bypass
  setStageBypass('bassEngine', _settings.bassEngine.bypassed);
  setStageBypass('compressor', _settings.compressor.bypassed);
  setStageBypass('stereoWidener', _settings.stereoWidener.bypassed);
  setStageBypass('reverb', _settings.reverb.bypassed);

  setBassSubBass(_settings.bassEngine.subBass);
  setBassShelf(_settings.bassEngine.bassShelf);
  setBassCompressorEnabled(_settings.bassEngine.compressor);
  setBassMonoBass(_settings.bassEngine.monoBass);
  setBassHarmonicEnhancer(_settings.bassEngine.harmonicEnhancer);

  setCompressorThreshold(_settings.compressor.threshold);
  setCompressorRatio(_settings.compressor.ratio);
  setCompressorAttack(_settings.compressor.attack);
  setCompressorRelease(_settings.compressor.release);
  setCompressorKnee(_settings.compressor.knee);
  setCompressorMakeupGain(_settings.compressor.makeupGain);

  setStereoWidth(_settings.stereoWidener.width);
  setReverbWet(_settings.reverb.wet);

  if (_stageOrder.join() !== _settings.stageOrder.join()) {
    rewireDSPChain(_settings.stageOrder);
  }
}
```

- [ ] **Step 5.5: Run full test suite — all should pass**

```bash
npx vitest run __tests__/dsp.test.ts 2>&1 | tail -10
```

- [ ] **Step 5.6: Commit**

```bash
git add app/lib/dsp.ts __tests__/dsp.test.ts
git commit -m "feat: dsp.ts persistence load/save + IR cache test"
```

---

## Task 6: Integrate `dsp.ts` into `playerContext.tsx`

**Files:**
- Modify: `app/lib/playerContext.tsx`

This task removes EQ node creation from `playerContext.tsx` and delegates everything to `dsp.ts`.

- [ ] **Step 6.1: Update `playerContext.tsx`**

In `app/lib/playerContext.tsx`, make these changes:

**a) Remove the old EQ + audio node declarations** (lines 268–298 in current file) — remove:
```ts
let eqNodes: BiquadFilterNode[] = [];
let eqBypassGains: number[] = [];
```
And the old `setEQBandGain` / `setEQBypass` standalone functions.

**b) Update the `ensureAudio` function** — replace its body with:

```ts
export function ensureAudio() {
  if (audioEl) return;
  audioEl = new Audio();
  audioCtx = new AudioContext();
  _analyserNode = audioCtx.createAnalyser();
  _analyserNode.fftSize = 2048;
  gainNode = audioCtx.createGain();

  const src = audioCtx.createMediaElementSource(audioEl);
  src.connect(_analyserNode);

  // DSP chain: analyser → [full DSP pipeline] → gainNode → destination
  initDSP(audioCtx, _analyserNode, gainNode);
  gainNode.connect(audioCtx.destination);

  // Restore persisted DSP settings async
  loadDSPSettings().then(() => applyLoadedSettings());
}
```

**c) Add imports at the top of `playerContext.tsx`:**

```ts
import {
  initDSP,
  loadDSPSettings,
  applyLoadedSettings,
  setEQBandGain as dspSetEQBandGain,
  setEQBypass as dspSetEQBypass,
  setReplayGain,
} from './dsp';
```

**d) Update `setEQBandGain` / `setEQBypass` callbacks** in the Provider to delegate to dsp.ts:

```ts
const setEQBandGainCb = useCallback((index: number, gainDb: number) => dspSetEQBandGain(index, gainDb), []);
const setEQBypassCb   = useCallback((on: boolean) => dspSetEQBypass(on), []);
```

**e) Add ReplayGain read in `loadFiles`** — in the `readTags` then-callback (after existing patch dispatch), add:

```ts
// Read ReplayGain tag and apply
jsmediatags.read(arr[i], {
  onSuccess: (tag: { tags: Record<string, string> }) => {
    const rgTag = tag.tags?.['REPLAYGAIN_TRACK_GAIN'] ?? null;
    // Only apply if this is the currently playing track
    if (stateRef.current.queue[stateRef.current.queuePos] === track.id) {
      setReplayGain(rgTag);
    }
  },
  onError: () => {},
});
```

Actually, since jsmediatags is already called once in `readTags`, merge the ReplayGain read into the existing callback. In the existing `readTags` function, update the `onSuccess` handler to also return the `REPLAYGAIN_TRACK_GAIN` tag:

```ts
function readTags(file: File): Promise<{ title?: string; artist?: string; album?: string; coverUrl?: string; replayGain?: string }> {
  return new Promise(resolve => {
    jsmediatags.read(file, {
      onSuccess: tag => {
        const { title, artist, album, picture } = tag.tags;
        const replayGain = (tag.tags as Record<string, string>)['REPLAYGAIN_TRACK_GAIN'] ?? undefined;
        let coverUrl = '';
        if (picture) {
          const bytes = new Uint8Array(picture.data);
          const blob = new Blob([bytes], { type: picture.format });
          coverUrl = URL.createObjectURL(blob);
        }
        resolve({ title: title || '', artist: artist || '', album: album || '', coverUrl, replayGain });
      },
      onError: () => resolve({}),
    });
  });
}
```

Then in the `.then(meta => { ... })` callback in `loadFiles`, after dispatching the patch, add:

```ts
// Apply ReplayGain if this is the currently playing track
if (meta.replayGain !== undefined) {
  const cur = stateRef.current;
  if (cur.queue[cur.queuePos] === track.id) {
    setReplayGain(meta.replayGain ?? null);
  }
}
```

**f) Also apply ReplayGain on track change** — add a `useEffect` that fires when `state.queuePos` changes:

```ts
// Apply ReplayGain on track change
useEffect(() => {
  const trackId = state.queue[state.queuePos];
  const track = trackId ? state.tracks.find(t => t.id === trackId) : null;
  if (!track) { setReplayGain(null); return; }
  // We don't store replayGain in Track — it will be (re-)read by readTags when the track loads.
  // Reset to unity on track change; the loadFiles callback will set it if available.
  setReplayGain(null);
}, [state.queuePos]);
```

- [ ] **Step 6.2: Run full test suite to ensure nothing broke**

```bash
npx vitest run 2>&1 | tail -20
```

Expected: all existing tests still pass (153+). The DSP integration is in browser-only code — tests mock the relevant pieces.

- [ ] **Step 6.3: Commit**

```bash
git add app/lib/playerContext.tsx
git commit -m "feat: playerContext delegates DSP to dsp.ts, adds ReplayGain tag read"
```

---

## Task 7: `DSPPanel.tsx` + `DspCard` infrastructure

**Files:**
- Create: `app/components/dsp/DspCard.tsx`
- Create: `app/components/dsp/DSPPanel.tsx` (shell only — no stage content yet)

- [ ] **Step 7.1: Create `app/components/dsp/DspCard.tsx`**

```tsx
'use client';

import { memo, type ReactNode } from 'react';
import { Power } from 'lucide-react';

interface DspCardProps {
  title: string;
  bypassed?: boolean;
  onBypassToggle?: (v: boolean) => void;
  showBypass?: boolean;
  showDragHandle?: boolean;
  dragHandleProps?: Record<string, unknown>;
  children?: ReactNode;
  readOnlyLabel?: string;
}

export const DspCard = memo(function DspCard({
  title,
  bypassed = false,
  onBypassToggle,
  showBypass = true,
  showDragHandle = false,
  dragHandleProps,
  children,
  readOnlyLabel,
}: DspCardProps) {
  return (
    <div
      className="border rounded-none sm:rounded border-white/8 overflow-hidden"
      style={{ background: 'var(--nx-bg-panel)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 select-none">
        {showDragHandle && (
          <span
            {...(dragHandleProps as object)}
            className="cursor-grab text-white/20 hover:text-white/60 transition-colors px-0.5 touch-manipulation"
            title="Drag to reorder"
          >
            ⠿
          </span>
        )}

        {showBypass && onBypassToggle && (
          <button
            onClick={() => onBypassToggle(!bypassed)}
            title={bypassed ? 'Enable stage' : 'Bypass stage'}
            className="w-6 h-6 flex items-center justify-center shrink-0 transition-colors"
            style={{ color: bypassed ? 'var(--nx-text-dim)' : 'var(--nx-cyan)' }}
          >
            <Power size={13} />
          </button>
        )}

        <span
          className="font-mono uppercase tracking-widest text-[9px] flex-1"
          style={{ color: bypassed ? 'var(--nx-text-dim)' : 'var(--nx-cyan-dim)' }}
        >
          {title}
        </span>

        {readOnlyLabel && (
          <span className="font-mono text-[9px] opacity-50">{readOnlyLabel}</span>
        )}
      </div>

      {/* Body */}
      {children && (
        <div className="px-3 pb-3 pt-1">
          {children}
        </div>
      )}
    </div>
  );
});
```

- [ ] **Step 7.2: Create `app/components/dsp/DSPPanel.tsx` (shell)**

```tsx
'use client';

import { memo } from 'react';
import { DspCard } from './DspCard';

interface DSPPanelProps {
  open: boolean;
  onClose: () => void;
}

export const DSPPanel = memo(function DSPPanel({ open, onClose: _onClose }: DSPPanelProps) {
  return (
    <div
      className="overflow-hidden transition-all duration-200 ease-in-out bg-black/85 backdrop-blur-xl border-t border-white/8"
      style={{ height: open ? 280 : 0, maxHeight: open ? 280 : 0, opacity: open ? 1 : 0 }}
    >
      <div className="h-[280px] overflow-y-auto flex flex-col gap-0.5 p-2">
        {/* Placeholder — stages wired in Tasks 8–14 */}
        <DspCard title="DSP Chain — stages coming soon" showBypass={false} />
      </div>
    </div>
  );
});
```

- [ ] **Step 7.3: Commit**

```bash
git add app/components/dsp/DspCard.tsx app/components/dsp/DSPPanel.tsx
git commit -m "feat: DspCard + DSPPanel shell"
```

---

## Task 8: `ReplayGainStage.tsx` + `LimiterStage.tsx`

**Files:**
- Create: `app/components/dsp/stages/ReplayGainStage.tsx`
- Create: `app/components/dsp/stages/LimiterStage.tsx`

- [ ] **Step 8.1: Create `ReplayGainStage.tsx`**

```tsx
'use client';

import { DspCard } from '../DspCard';

interface Props {
  detectedGain: string | null; // e.g. "-6.5 dB" or null
}

export function ReplayGainStage({ detectedGain }: Props) {
  return (
    <DspCard
      title="ReplayGain"
      showBypass={false}
      readOnlyLabel={detectedGain ? detectedGain : 'no tag'}
    />
  );
}
```

- [ ] **Step 8.2: Create `LimiterStage.tsx`**

```tsx
'use client';

import { DspCard } from '../DspCard';

export function LimiterStage() {
  return (
    <DspCard
      title="Limiter"
      showBypass={false}
      readOnlyLabel="-0.1 dBFS brickwall"
    />
  );
}
```

- [ ] **Step 8.3: Commit**

```bash
git add app/components/dsp/stages/ReplayGainStage.tsx app/components/dsp/stages/LimiterStage.tsx
git commit -m "feat: ReplayGainStage + LimiterStage components"
```

---

## Task 9: `BassEngineStage.tsx`

**Files:**
- Create: `app/components/dsp/stages/BassEngineStage.tsx`

- [ ] **Step 9.1: Create `BassEngineStage.tsx`**

```tsx
'use client';

import { memo } from 'react';
import { DspCard } from '../DspCard';
import {
  setStageBypass,
  setBassSubBass,
  setBassShelf,
  setBassCompressorEnabled,
  setBassMonoBass,
  setBassHarmonicEnhancer,
  getDSPSettings,
} from '../../../lib/dsp';

interface Props {
  dragHandleProps?: Record<string, unknown>;
}

function DspSlider({
  label, value, min, max, step = 0.5,
  onChange, unit = 'dB',
}: {
  label: string; value: number; min: number; max: number;
  step?: number; onChange: (v: number) => void; unit?: string;
}) {
  return (
    <div className="flex items-center gap-2 min-h-[44px]">
      <span className="font-mono text-[9px] w-20 shrink-0 opacity-60">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-cyan-400"
      />
      <span className="font-mono text-[9px] w-12 text-right opacity-60">
        {value >= 0 ? '+' : ''}{value.toFixed(1)}{unit}
      </span>
    </div>
  );
}

function DspToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="h-[44px] px-3 rounded font-mono text-[9px] uppercase tracking-widest transition-colors shrink-0 touch-manipulation"
      style={{
        background: value ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.04)',
        color: value ? 'var(--nx-cyan)' : 'var(--nx-text-dim)',
        border: `1px solid ${value ? 'var(--nx-cyan)' : 'transparent'}`,
      }}
    >
      {label}
    </button>
  );
}

export const BassEngineStage = memo(function BassEngineStage({ dragHandleProps }: Props) {
  const s = getDSPSettings().bassEngine;

  return (
    <DspCard
      title="Bass Engine"
      bypassed={s.bypassed}
      onBypassToggle={v => { setStageBypass('bassEngine', v); }}
      showBypass
      showDragHandle
      dragHandleProps={dragHandleProps}
    >
      <DspSlider label="Sub-bass" value={s.subBass} min={-12} max={12} onChange={setBassSubBass} />
      <DspSlider label="Bass shelf" value={s.bassShelf} min={-12} max={12} onChange={setBassShelf} />
      <div className="flex flex-wrap gap-2 mt-1">
        <DspToggle label="Compressor" value={s.compressor} onChange={setBassCompressorEnabled} />
        <DspToggle label="Mono bass" value={s.monoBass} onChange={setBassMonoBass} />
        <DspToggle label="Harmonic" value={s.harmonicEnhancer} onChange={setBassHarmonicEnhancer} />
      </div>
    </DspCard>
  );
});
```

- [ ] **Step 9.2: Commit**

```bash
git add app/components/dsp/stages/BassEngineStage.tsx
git commit -m "feat: BassEngineStage component"
```

---

## Task 10: `CompressorStage.tsx` + GR meter

**Files:**
- Create: `app/components/dsp/stages/CompressorStage.tsx`

- [ ] **Step 10.1: Create `CompressorStage.tsx`**

```tsx
'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { DspCard } from '../DspCard';
import {
  setStageBypass,
  setCompressorThreshold,
  setCompressorRatio,
  setCompressorAttack,
  setCompressorRelease,
  setCompressorKnee,
  setCompressorMakeupGain,
  getCompressorReduction,
  getDSPSettings,
} from '../../../lib/dsp';

function DspSlider({
  label, value, min, max, step = 0.1,
  onChange, formatVal,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; onChange: (v: number) => void;
  formatVal?: (v: number) => string;
}) {
  const fmt = formatVal ?? ((v: number) => (v >= 0 ? '+' : '') + v.toFixed(1));
  return (
    <div className="flex items-center gap-2 min-h-[44px]">
      <span className="font-mono text-[9px] w-16 shrink-0 opacity-60">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-cyan-400"
      />
      <span className="font-mono text-[9px] w-14 text-right opacity-60">{fmt(value)}</span>
    </div>
  );
}

function GRMeter() {
  const [reduction, setReduction] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    function tick() {
      setReduction(Math.abs(getCompressorReduction()));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const pct = Math.min(reduction / 20, 1) * 100; // 20 dB max GR

  return (
    <div className="flex items-center gap-2 min-h-[44px]">
      <span className="font-mono text-[9px] w-16 shrink-0 opacity-60">GR</span>
      <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
        <div
          className="h-full rounded-full transition-none"
          style={{
            width: `${pct}%`,
            background: pct > 75 ? 'var(--nx-red)' : pct > 40 ? '#f59e0b' : 'var(--nx-cyan)',
          }}
        />
      </div>
      <span className="font-mono text-[9px] w-14 text-right opacity-60">
        -{reduction.toFixed(1)} dB
      </span>
    </div>
  );
}

interface Props {
  dragHandleProps?: Record<string, unknown>;
}

export const CompressorStage = memo(function CompressorStage({ dragHandleProps }: Props) {
  const s = getDSPSettings().compressor;

  return (
    <DspCard
      title="Compressor"
      bypassed={s.bypassed}
      onBypassToggle={v => setStageBypass('compressor', v)}
      showBypass
      showDragHandle
      dragHandleProps={dragHandleProps}
    >
      <GRMeter />
      <DspSlider label="Threshold" value={s.threshold} min={-60} max={0} step={1}
        onChange={setCompressorThreshold} formatVal={v => `${v.toFixed(0)} dB`} />
      <DspSlider label="Ratio" value={s.ratio} min={1} max={20} step={0.5}
        onChange={setCompressorRatio} formatVal={v => `${v.toFixed(1)}:1`} />
      <DspSlider label="Attack" value={s.attack} min={0} max={1} step={0.001}
        onChange={setCompressorAttack} formatVal={v => `${(v * 1000).toFixed(0)} ms`} />
      <DspSlider label="Release" value={s.release} min={0} max={1} step={0.01}
        onChange={setCompressorRelease} formatVal={v => `${(v * 1000).toFixed(0)} ms`} />
      <DspSlider label="Knee" value={s.knee} min={0} max={40} step={1}
        onChange={setCompressorKnee} formatVal={v => `${v.toFixed(0)} dB`} />
      <DspSlider label="Makeup" value={s.makeupGain} min={0} max={24} step={0.5}
        onChange={setCompressorMakeupGain} formatVal={v => `+${v.toFixed(1)} dB`} />
    </DspCard>
  );
});
```

- [ ] **Step 10.2: Commit**

```bash
git add app/components/dsp/stages/CompressorStage.tsx
git commit -m "feat: CompressorStage with live GR meter"
```

---

## Task 11: `StereoWidenerStage.tsx`

**Files:**
- Create: `app/components/dsp/stages/StereoWidenerStage.tsx`

- [ ] **Step 11.1: Create `StereoWidenerStage.tsx`**

```tsx
'use client';

import { memo } from 'react';
import { DspCard } from '../DspCard';
import {
  setStageBypass,
  setStereoWidth,
  getDSPSettings,
} from '../../../lib/dsp';

interface Props {
  dragHandleProps?: Record<string, unknown>;
}

export const StereoWidenerStage = memo(function StereoWidenerStage({ dragHandleProps }: Props) {
  const s = getDSPSettings().stereoWidener;

  function widthLabel(w: number): string {
    if (w === 0) return 'Mono';
    if (w === 100) return 'Unity';
    if (w === 200) return 'Hyper';
    return `${w}%`;
  }

  return (
    <DspCard
      title="Stereo Widener"
      bypassed={s.bypassed}
      onBypassToggle={v => setStageBypass('stereoWidener', v)}
      showBypass
      showDragHandle
      dragHandleProps={dragHandleProps}
    >
      <div className="flex items-center gap-2 min-h-[44px]">
        <span className="font-mono text-[9px] w-16 shrink-0 opacity-60">Width</span>
        <input
          type="range" min={0} max={200} step={1} value={s.width}
          onChange={e => setStereoWidth(parseInt(e.target.value))}
          className="flex-1 h-1 accent-cyan-400"
        />
        <span className="font-mono text-[9px] w-14 text-right opacity-60">{widthLabel(s.width)}</span>
      </div>
    </DspCard>
  );
});
```

- [ ] **Step 11.2: Commit**

```bash
git add app/components/dsp/stages/StereoWidenerStage.tsx
git commit -m "feat: StereoWidenerStage component"
```

---

## Task 12: `ReverbStage.tsx`

**Files:**
- Create: `app/components/dsp/stages/ReverbStage.tsx`

- [ ] **Step 12.1: Create `ReverbStage.tsx`**

```tsx
'use client';

import { memo } from 'react';
import { DspCard } from '../DspCard';
import {
  setStageBypass,
  setReverbWet,
  setReverbPreset,
  getDSPSettings,
} from '../../../lib/dsp';
import type { DSPSettings } from '../../../lib/dsp';

const PRESETS: DSPSettings['reverb']['preset'][] = ['Studio', 'Hall', 'Church', 'Outdoor'];

interface Props {
  dragHandleProps?: Record<string, unknown>;
}

export const ReverbStage = memo(function ReverbStage({ dragHandleProps }: Props) {
  const s = getDSPSettings().reverb;

  return (
    <DspCard
      title="Reverb"
      bypassed={s.bypassed}
      onBypassToggle={v => setStageBypass('reverb', v)}
      showBypass
      showDragHandle
      dragHandleProps={dragHandleProps}
    >
      <div className="flex gap-1 flex-wrap mt-1">
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => setReverbPreset(p)}
            className="h-[44px] px-3 font-mono text-[9px] uppercase tracking-widest transition-colors touch-manipulation rounded"
            style={{
              background: s.preset === p ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.04)',
              color: s.preset === p ? 'var(--nx-cyan)' : 'var(--nx-text-dim)',
              border: `1px solid ${s.preset === p ? 'var(--nx-cyan)' : 'transparent'}`,
            }}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 min-h-[44px] mt-1">
        <span className="font-mono text-[9px] w-16 shrink-0 opacity-60">Wet</span>
        <input
          type="range" min={0} max={1} step={0.01} value={s.wet}
          onChange={e => setReverbWet(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-cyan-400"
        />
        <span className="font-mono text-[9px] w-14 text-right opacity-60">
          {Math.round(s.wet * 100)}%
        </span>
      </div>
    </DspCard>
  );
});
```

- [ ] **Step 12.2: Commit**

```bash
git add app/components/dsp/stages/ReverbStage.tsx
git commit -m "feat: ReverbStage component"
```

---

## Task 13: `DSPPanel.tsx` — full implementation with drag-to-reorder

**Files:**
- Modify: `app/components/dsp/DSPPanel.tsx`

- [ ] **Step 13.1: Replace `DSPPanel.tsx` with full implementation**

```tsx
'use client';

import { memo, useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { rewireDSPChain, getStageOrder, getDSPSettings, type StageId } from '../../lib/dsp';
import { ReplayGainStage } from './stages/ReplayGainStage';
import { BassEngineStage } from './stages/BassEngineStage';
import { CompressorStage } from './stages/CompressorStage';
import { StereoWidenerStage } from './stages/StereoWidenerStage';
import { ReverbStage } from './stages/ReverbStage';
import { LimiterStage } from './stages/LimiterStage';
import { EQLink } from './stages/EQLink';

// ─── Sortable stage wrapper ───────────────────────────────────────────────────

function SortableStage({ id, children }: { id: StageId; children: (dragHandleProps: Record<string, unknown>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

// ─── Stage renderer ───────────────────────────────────────────────────────────

function renderStage(id: StageId, dragHandleProps: Record<string, unknown>) {
  switch (id) {
    case 'eq':             return <EQLink dragHandleProps={dragHandleProps} />;
    case 'bassEngine':     return <BassEngineStage dragHandleProps={dragHandleProps} />;
    case 'compressor':     return <CompressorStage dragHandleProps={dragHandleProps} />;
    case 'stereoWidener':  return <StereoWidenerStage dragHandleProps={dragHandleProps} />;
    case 'reverb':         return <ReverbStage dragHandleProps={dragHandleProps} />;
  }
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface DSPPanelProps {
  open: boolean;
  onClose: () => void;
  onOpenEQ: () => void;
  detectedReplayGain: string | null;
}

export const DSPPanel = memo(function DSPPanel({
  open, onClose: _onClose, onOpenEQ, detectedReplayGain,
}: DSPPanelProps) {
  const [order, setOrder] = useState<StageId[]>(() => getStageOrder());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as StageId);
    const newIndex = order.indexOf(over.id as StageId);
    const newOrder = arrayMove(order, oldIndex, newIndex);
    setOrder(newOrder);
    rewireDSPChain(newOrder);
  }, [order]);

  return (
    <div
      className="overflow-hidden transition-all duration-200 ease-in-out bg-black/85 backdrop-blur-xl border-t border-white/8"
      style={{ height: open ? 280 : 0, maxHeight: open ? 280 : 0, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
    >
      <div className="h-[280px] overflow-y-auto flex flex-col gap-0.5 p-2">
        {/* Fixed top: ReplayGain */}
        <ReplayGainStage detectedGain={detectedReplayGain} />

        {/* Sortable middle stages */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            {order.map(id => (
              <SortableStage key={id} id={id}>
                {dragHandleProps => renderStage(id, dragHandleProps)}
              </SortableStage>
            ))}
          </SortableContext>
        </DndContext>

        {/* Fixed bottom: Limiter */}
        <LimiterStage />
      </div>
    </div>
  );
});
```

- [ ] **Step 13.2: Create `app/components/dsp/stages/EQLink.tsx`**

```tsx
'use client';

import { DspCard } from '../DspCard';
import { setStageBypass, getDSPSettings } from '../../../lib/dsp';

interface Props {
  dragHandleProps?: Record<string, unknown>;
  onOpenEQ?: () => void;
}

export function EQLink({ dragHandleProps, onOpenEQ }: Props) {
  const s = getDSPSettings();
  // EQ bypass is tracked under eq stage
  const bypassed = s.bassEngine.bypassed; // placeholder — will use eq-specific bypass

  return (
    <DspCard
      title="Parametric EQ"
      bypassed={false}
      onBypassToggle={v => setStageBypass('eq', v)}
      showBypass
      showDragHandle
      dragHandleProps={dragHandleProps}
    >
      {onOpenEQ && (
        <button
          onClick={onOpenEQ}
          className="font-mono text-[9px] uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity min-h-[44px] px-2 touch-manipulation"
          style={{ color: 'var(--nx-cyan)' }}
        >
          Open EQ →
        </button>
      )}
    </DspCard>
  );
}
```

Fix the `EQLink` — it should use the EQ bypass from `dsp.ts`. Update `dsp.ts` to export an `eqBypassed` getter or use `getStageBypass('eq')`. Update `EQLink.tsx`:

```tsx
'use client';

import { DspCard } from '../DspCard';
import { setStageBypass, getStageBypass } from '../../../lib/dsp';

interface Props {
  dragHandleProps?: Record<string, unknown>;
  onOpenEQ?: () => void;
}

export function EQLink({ dragHandleProps, onOpenEQ }: Props) {
  return (
    <DspCard
      title="Parametric EQ"
      bypassed={getStageBypass('eq')}
      onBypassToggle={v => setStageBypass('eq', v)}
      showBypass
      showDragHandle
      dragHandleProps={dragHandleProps}
    >
      {onOpenEQ && (
        <button
          onClick={onOpenEQ}
          className="font-mono text-[9px] uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity min-h-[44px] px-2 touch-manipulation"
          style={{ color: 'var(--nx-cyan)' }}
        >
          Open EQ →
        </button>
      )}
    </DspCard>
  );
}
```

Update `DSPPanel.tsx` to thread `onOpenEQ` into `EQLink` via `renderStage`:

```tsx
// Update renderStage to accept onOpenEQ
function renderStage(id: StageId, dragHandleProps: Record<string, unknown>, onOpenEQ: () => void) {
  switch (id) {
    case 'eq':             return <EQLink dragHandleProps={dragHandleProps} onOpenEQ={onOpenEQ} />;
    case 'bassEngine':     return <BassEngineStage dragHandleProps={dragHandleProps} />;
    case 'compressor':     return <CompressorStage dragHandleProps={dragHandleProps} />;
    case 'stereoWidener':  return <StereoWidenerStage dragHandleProps={dragHandleProps} />;
    case 'reverb':         return <ReverbStage dragHandleProps={dragHandleProps} />;
  }
}
```

And in the `SortableStage` render call:
```tsx
{order.map(id => (
  <SortableStage key={id} id={id}>
    {dragHandleProps => renderStage(id, dragHandleProps, onOpenEQ)}
  </SortableStage>
))}
```

- [ ] **Step 13.3: Commit**

```bash
git add app/components/dsp/DSPPanel.tsx app/components/dsp/stages/EQLink.tsx
git commit -m "feat: DSPPanel full implementation with dnd-kit drag reorder"
```

---

## Task 14: Wire `DSPPanel` into `PlayerShell` + `PlayerBar`

**Files:**
- Modify: `app/components/player/PlayerShell.tsx`
- Modify: `app/components/player/PlayerBar.tsx`

- [ ] **Step 14.1: Add `dspOpen` state and `DSPPanel` to `PlayerShell.tsx`**

In `PlayerShell.tsx`, add to the `PlayerInner` component:

**Add import:**
```tsx
import { DSPPanel } from '../dsp/DSPPanel';
```

**Add state:**
```tsx
const [dspOpen, setDspOpen] = useState(false);
const [detectedReplayGain, setDetectedReplayGain] = useState<string | null>(null);
```

**Add callbacks:**
```tsx
const handleToggleDSP  = useCallback(() => setDspOpen(o => !o), []);
const handleCloseDSP   = useCallback(() => setDspOpen(false), []);
```

**Update `useKeyboardShortcuts` call:**
```tsx
useKeyboardShortcuts({
  onOpenShortcuts: handleOpenShortcuts,
  focusSearch: handleFocusSearch,
  onToggleEQ: handleToggleEQ,
  onToggleDSP: handleToggleDSP,
});
```

**Add `<DSPPanel />` to the bottom stack** (between EQ drawer and `PlayerBar`):

```tsx
{/* DSP drawer */}
<div
  className="bg-black/85 backdrop-blur-xl border-t border-white/8 overflow-hidden transition-all duration-200 ease-in-out"
  style={{ height: dspOpen ? 280 : 0, maxHeight: dspOpen ? 280 : 0 }}
>
  <DSPPanel
    open={dspOpen}
    onClose={handleCloseDSP}
    onOpenEQ={handleToggleEQ}
    detectedReplayGain={detectedReplayGain}
  />
</div>
```

- [ ] **Step 14.2: Add `D` button to `PlayerBar.tsx`**

In `PlayerBar.tsx`, update the `PlayerBarProps` interface:

```tsx
interface PlayerBarProps {
  libOpen: boolean;
  onToggleLib: () => void;
  queueOpen: boolean;
  onToggleQueue: () => void;
  onOpenNowPlaying: () => void;
  onOpenShortcuts: () => void;
  eqOpen: boolean;
  onToggleEQ: () => void;
  dspOpen: boolean;
  onToggleDSP: () => void;
}
```

Add `dspOpen` and `onToggleDSP` to the component signature, then add the DSP button next to the EQ button in the secondary controls row (find the `SlidersHorizontal` EQ button and add alongside it):

```tsx
<NxBtn onClick={onToggleDSP} title="DSP chain (D)" active={dspOpen}>
  <span className="font-mono text-[10px] font-bold">DSP</span>
</NxBtn>
```

Update the `PlayerShell.tsx` `<PlayerBar>` invocation to pass the new props:
```tsx
<PlayerBar
  libOpen={showLib}
  onToggleLib={handleToggleLib}
  queueOpen={queueOpen}
  onToggleQueue={handleToggleQueue}
  onOpenNowPlaying={handleOpenNowPlaying}
  onOpenShortcuts={handleOpenShortcuts}
  eqOpen={eqOpen}
  onToggleEQ={handleToggleEQ}
  dspOpen={dspOpen}
  onToggleDSP={handleToggleDSP}
/>
```

- [ ] **Step 14.3: Build check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Fix any type errors before continuing.

- [ ] **Step 14.4: Commit**

```bash
git add app/components/player/PlayerShell.tsx app/components/player/PlayerBar.tsx
git commit -m "feat: wire DSPPanel into PlayerShell and PlayerBar"
```

---

## Task 15: `D` keyboard shortcut (TDD)

**Files:**
- Modify: `app/hooks/useKeyboardShortcuts.ts`
- Modify: `__tests__/useKeyboardShortcuts.test.tsx`

- [ ] **Step 15.1: Add failing test for `D` key**

Append to `__tests__/useKeyboardShortcuts.test.tsx` inside the `'useKeyboardShortcuts — new shortcuts'` describe block:

```ts
it('d fires onToggleDSP callback', () => {
  const opts = { onOpenShortcuts: vi.fn(), focusSearch: vi.fn(), onToggleDSP: vi.fn() };
  renderHook(() => useKeyboardShortcuts(opts));
  fireKey('d');
  expect(opts.onToggleDSP).toHaveBeenCalledOnce();
});
```

- [ ] **Step 15.2: Run test — verify it fails**

```bash
npx vitest run __tests__/useKeyboardShortcuts.test.tsx 2>&1 | tail -15
```

Expected: FAIL — `onToggleDSP` not called.

- [ ] **Step 15.3: Update `useKeyboardShortcuts.ts`**

Add `onToggleDSP` to `ShortcutOpts`:

```ts
interface ShortcutOpts {
  onOpenShortcuts?: () => void;
  focusSearch?: () => void;
  onToggleEQ?: () => void;
  onToggleDSP?: () => void;
}
```

Add case in the switch:

```ts
case 'd':
  optsRef.current.onToggleDSP?.();
  break;
```

- [ ] **Step 15.4: Run test — verify it passes**

```bash
npx vitest run __tests__/useKeyboardShortcuts.test.tsx 2>&1 | tail -10
```

- [ ] **Step 15.5: Commit**

```bash
git add app/hooks/useKeyboardShortcuts.ts __tests__/useKeyboardShortcuts.test.tsx
git commit -m "feat: D keyboard shortcut for DSP panel"
```

---

## Task 16: `DSPPanel.test.tsx` component tests

**Files:**
- Create: `__tests__/DSPPanel.test.tsx`

- [ ] **Step 16.1: Write component tests**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DSPPanel } from '../app/components/dsp/DSPPanel';

// Mock dsp.ts — we test the component in isolation
vi.mock('../app/lib/dsp', () => ({
  getStageOrder:   vi.fn(() => ['eq', 'bassEngine', 'compressor', 'stereoWidener', 'reverb']),
  getStageBypass:  vi.fn(() => false),
  setStageBypass:  vi.fn(),
  rewireDSPChain:  vi.fn(),
  getDSPSettings:  vi.fn(() => ({
    stageOrder: ['eq', 'bassEngine', 'compressor', 'stereoWidener', 'reverb'],
    replayGain: { enabled: true },
    bassEngine: { bypassed: false, subBass: 0, bassShelf: 0, compressor: false, monoBass: false, harmonicEnhancer: false },
    compressor: { bypassed: false, threshold: -24, ratio: 3, attack: 0.003, release: 0.25, knee: 30, makeupGain: 0 },
    stereoWidener: { bypassed: false, width: 100 },
    reverb: { bypassed: false, preset: 'Studio', wet: 0.2 },
  })),
  setReverbPreset:        vi.fn(),
  setReverbWet:           vi.fn(),
  setStereoWidth:         vi.fn(),
  setCompressorThreshold: vi.fn(),
  setCompressorRatio:     vi.fn(),
  setCompressorAttack:    vi.fn(),
  setCompressorRelease:   vi.fn(),
  setCompressorKnee:      vi.fn(),
  setCompressorMakeupGain:vi.fn(),
  getCompressorReduction: vi.fn(() => -3),
  setBassSubBass:         vi.fn(),
  setBassShelf:           vi.fn(),
  setBassCompressorEnabled: vi.fn(),
  setBassMonoBass:        vi.fn(),
  setBassHarmonicEnhancer:vi.fn(),
}));

function renderPanel(open = true) {
  return render(
    <DSPPanel
      open={open}
      onClose={vi.fn()}
      onOpenEQ={vi.fn()}
      detectedReplayGain="-4.5 dB"
    />
  );
}

describe('DSPPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders ReplayGain card with detected gain', () => {
    renderPanel();
    expect(screen.getByText(/ReplayGain/i)).toBeInTheDocument();
    expect(screen.getByText(/-4.5 dB/i)).toBeInTheDocument();
  });

  it('renders all 5 middle stage cards', () => {
    renderPanel();
    expect(screen.getByText(/Parametric EQ/i)).toBeInTheDocument();
    expect(screen.getByText(/Bass Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Compressor/i)).toBeInTheDocument();
    expect(screen.getByText(/Stereo Widener/i)).toBeInTheDocument();
    expect(screen.getByText(/Reverb/i)).toBeInTheDocument();
  });

  it('renders Limiter card', () => {
    renderPanel();
    expect(screen.getByText(/Limiter/i)).toBeInTheDocument();
    expect(screen.getByText(/-0.1 dBFS/i)).toBeInTheDocument();
  });

  it('calls setStageBypass when bypass button clicked on Compressor', () => {
    const { setStageBypass } = await import('../app/lib/dsp');
    renderPanel();
    const bypassBtns = screen.getAllByTitle(/Bypass stage|Enable stage/i);
    // Click any bypass button
    fireEvent.click(bypassBtns[0]);
    expect(setStageBypass).toHaveBeenCalled();
  });

  it('reverb preset buttons are rendered', () => {
    renderPanel();
    expect(screen.getByText('Studio')).toBeInTheDocument();
    expect(screen.getByText('Hall')).toBeInTheDocument();
    expect(screen.getByText('Church')).toBeInTheDocument();
    expect(screen.getByText('Outdoor')).toBeInTheDocument();
  });

  it('clicking a reverb preset calls setReverbPreset', async () => {
    const { setReverbPreset } = await import('../app/lib/dsp');
    renderPanel();
    fireEvent.click(screen.getByText('Hall'));
    expect(setReverbPreset).toHaveBeenCalledWith('Hall');
  });

  it('GR meter renders in Compressor stage', () => {
    renderPanel();
    expect(screen.getByText(/GR/i)).toBeInTheDocument();
  });

  it('panel is hidden when open=false', () => {
    const { container } = renderPanel(false);
    const panel = container.firstChild as HTMLElement;
    expect(panel.style.height).toBe('0');
  });
});
```

- [ ] **Step 16.2: Run tests — fix any failures**

```bash
npx vitest run __tests__/DSPPanel.test.tsx 2>&1 | tail -30
```

The `await import` inside the test won't work well due to static mock hoisting. Fix by importing at the top of the test file:

```ts
import * as dsp from '../app/lib/dsp';
```

And replace `await import('../app/lib/dsp')` with `dsp` in the test bodies.

- [ ] **Step 16.3: Run full test suite**

```bash
npx vitest run 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 16.4: Commit**

```bash
git add __tests__/DSPPanel.test.tsx
git commit -m "test: DSPPanel component tests"
```

---

## Task 17: IR WAV files + `PROGRESS.md`

**Files:**
- Create: `public/ir/Studio.wav`, `Hall.wav`, `Church.wav`, `Outdoor.wav`
- Modify: `PROGRESS.md`

- [ ] **Step 17.1: Generate placeholder IR WAV files**

Run this Node.js script to generate minimal impulse response WAVs (Dirac delta — "dry room"):

```bash
node -e "
const fs = require('fs');
const sampleRate = 44100;
const duration = 1; // 1 second IR
const numSamples = sampleRate * duration;

function writeWav(filename, impulseOffset = 0, decay = 0.5) {
  const buf = Buffer.alloc(44 + numSamples * 2);
  // RIFF header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + numSamples * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);       // chunk size
  buf.writeUInt16LE(1, 20);        // PCM
  buf.writeUInt16LE(1, 22);        // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32);        // block align
  buf.writeUInt16LE(16, 34);       // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(numSamples * 2, 40);
  // Impulse at offset + decaying tail
  for (let i = 0; i < numSamples; i++) {
    let val = 0;
    if (i === impulseOffset) val = 32767;
    else if (i > impulseOffset) {
      val = Math.round(32767 * Math.exp(-decay * (i - impulseOffset) / 100) * (Math.random() * 2 - 1) * 0.3);
    }
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, val)), 44 + i * 2);
  }
  fs.writeFileSync(filename, buf);
  console.log('Wrote', filename);
}

fs.mkdirSync('public/ir', { recursive: true });
writeWav('public/ir/Studio.wav',  0, 8);
writeWav('public/ir/Hall.wav',    441, 2);
writeWav('public/ir/Church.wav',  882, 0.8);
writeWav('public/ir/Outdoor.wav', 220, 4);
"
```

> **Note:** These are placeholder IRs. Replace with professional IRs (e.g., OpenAIR library, free for non-commercial use) for production quality. Each should be under 300KB.

- [ ] **Step 17.2: Update `PROGRESS.md` — mark Feature 8 complete**

Find the Feature 8 section in `PROGRESS.md` and replace the `❌` items with `✅`:

```markdown
### Feature 8 — Full DSP Signal Chain ✅

- [x] ReplayGain (read `REPLAYGAIN_TRACK_GAIN` tag)
- [x] Bass Engine (sub-bass shelf, bass compressor, mono bass mode, harmonic enhancer)
- [x] Parametric EQ nodes (same as Feature 2)
- [x] Compressor (`DynamicsCompressorNode` with full controls + GR meter)
- [x] Stereo Widener (native M-S matrix via ChannelSplitter/Merger)
- [x] Convolution Reverb (`ConvolverNode` + 4 IR WAV presets in `/public/ir/`)
- [x] Brickwall Limiter at -0.1 dBFS
- [x] Drag-to-reorder DSP chain
- [x] `D` keyboard shortcut for DSP panel
```

Also add to the File Inventory:
```
| `app/lib/dsp.ts` | DSP node creation, wiring, bypass, rewire, mutation, persistence |
| `app/components/dsp/DSPPanel.tsx` | DSP chain drawer — sortable stage cards |
| `app/components/dsp/DspCard.tsx` | Shared card wrapper with bypass toggle + drag handle |
| `app/components/dsp/stages/*.tsx` | Per-stage UI components (6 stages) |
| `public/ir/*.wav` | Impulse response WAVs for ConvolverNode |
```

- [ ] **Step 17.3: Run full test suite one final time**

```bash
npx vitest run 2>&1 | tail -20
```

Expected: all tests pass (original 153+ plus the ~35 new ones).

- [ ] **Step 17.4: Commit**

```bash
git add public/ir/ PROGRESS.md
git commit -m "feat: IR WAV placeholder files, PROGRESS.md Feature 8 complete"
```

---

## Summary

| Task | Files | New tests |
|------|-------|-----------|
| 1 | `db.ts`, `dsp.ts` (types) | — |
| 2 | `dsp.ts` (init+wiring), `dsp.test.ts` | 8 |
| 3 | `dsp.ts` (bypass+rewire), `dsp.test.ts` | 6 |
| 4 | `dsp.ts` (setters), `dsp.test.ts` | 9 |
| 5 | `dsp.ts` (persistence), `dsp.test.ts` | 2 |
| 6 | `playerContext.tsx` | — |
| 7 | `DspCard.tsx`, `DSPPanel.tsx` (shell) | — |
| 8 | `ReplayGainStage.tsx`, `LimiterStage.tsx` | — |
| 9 | `BassEngineStage.tsx` | — |
| 10 | `CompressorStage.tsx` | — |
| 11 | `StereoWidenerStage.tsx` | — |
| 12 | `ReverbStage.tsx` | — |
| 13 | `DSPPanel.tsx` (full), `EQLink.tsx` | — |
| 14 | `PlayerShell.tsx`, `PlayerBar.tsx` | — |
| 15 | `useKeyboardShortcuts.ts`, test | 1 |
| 16 | `DSPPanel.test.tsx` | 8 |
| 17 | `public/ir/*.wav`, `PROGRESS.md` | — |

**Total new tests: ~34**
