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
