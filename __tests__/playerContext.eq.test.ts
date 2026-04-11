import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { INITIAL_BANDS } from '../app/lib/eqPresets';

type MockBiquadNode = {
  frequency: { value: number };
  gain: { value: number };
  Q: { value: number };
  type: string;
  connect: ReturnType<typeof vi.fn>;
};

let mockBiquadNodes: MockBiquadNode[];
let mockGainNodes: { gain: { value: number }; connect: ReturnType<typeof vi.fn> }[];

function makeMockAudioContext() {
  mockBiquadNodes = [];
  mockGainNodes = [];
  return {
    createAnalyser: vi.fn(() => ({ fftSize: 0, connect: vi.fn() })),
    createGain: vi.fn(() => {
      const n = { gain: { value: 1 }, connect: vi.fn() };
      mockGainNodes.push(n);
      return n;
    }),
    createMediaElementSource: vi.fn(() => ({ connect: vi.fn() })),
    createBiquadFilter: vi.fn(() => {
      const node: MockBiquadNode = {
        frequency: { value: 0 },
        gain: { value: 0 },
        Q: { value: 0 },
        type: 'peaking',
        connect: vi.fn(),
      };
      mockBiquadNodes.push(node);
      return node;
    }),
    createDynamicsCompressor: vi.fn(() => ({
      threshold: { value: 0 }, ratio: { value: 1 }, attack: { value: 0 },
      release: { value: 0 }, knee: { value: 0 }, connect: vi.fn(), reduction: 0,
    })),
    createChannelSplitter: vi.fn(() => ({ connect: vi.fn() })),
    createChannelMerger: vi.fn(() => ({ connect: vi.fn() })),
    createConvolver: vi.fn(() => ({ connect: vi.fn(), buffer: null })),
    createWaveShaper: vi.fn(() => ({ connect: vi.fn(), curve: null, oversample: '2x' })),
    state: 'running',
    resume: vi.fn(),
    destination: {},
  };
}

describe('playerContext EQ audio chain (delegated to dsp.ts)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('AudioContext', vi.fn(makeMockAudioContext));
    class MockAudio {
      addEventListener = vi.fn();
      pause = vi.fn();
      play = vi.fn().mockResolvedValue(undefined);
      load = vi.fn();
    }
    vi.stubGlobal('Audio', MockAudio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ensureAudio creates 10 BiquadFilterNodes (via dsp.ts)', async () => {
    const { ensureAudio } = await import('../app/lib/playerContext');
    ensureAudio();
    // dsp.ts creates 10 EQ biquad nodes plus additional nodes for bass engine etc.
    // The first 10 biquad nodes should be the EQ nodes
    expect(mockBiquadNodes.length).toBeGreaterThanOrEqual(10);
    expect(mockBiquadNodes.slice(0, 10)).toHaveLength(10);
  });

  it('BiquadFilterNodes have correct freq / Q / type from INITIAL_BANDS', async () => {
    const { ensureAudio } = await import('../app/lib/playerContext');
    ensureAudio();
    // The first 10 biquad nodes created by dsp.ts are the EQ nodes
    INITIAL_BANDS.forEach((band, i) => {
      expect(mockBiquadNodes[i].frequency.value).toBe(band.freq);
      expect(mockBiquadNodes[i].Q.value).toBe(band.q);
      expect(mockBiquadNodes[i].type).toBe(band.type);
    });
  });

  it('setEQBandGain (from dsp) sets gain on the correct node', async () => {
    const { ensureAudio } = await import('../app/lib/playerContext');
    const { setEQBandGain } = await import('../app/lib/dsp');
    ensureAudio();
    setEQBandGain(3, 8);
    expect(mockBiquadNodes[3].gain.value).toBe(8);
    expect(mockBiquadNodes[0].gain.value).toBe(0); // others unchanged
  });

  it('setEQBypass(true) via dsp bypasses EQ stage', async () => {
    const { ensureAudio } = await import('../app/lib/playerContext');
    const { setEQBandGain, setEQBypass, getStageBypass } = await import('../app/lib/dsp');
    ensureAudio();
    setEQBandGain(0, 6);
    setEQBandGain(4, -3);
    setEQBypass(true);
    expect(getStageBypass('eq')).toBe(true);
  });

  it('setEQBypass(false) via dsp un-bypasses EQ stage', async () => {
    const { ensureAudio } = await import('../app/lib/playerContext');
    const { setEQBypass, getStageBypass } = await import('../app/lib/dsp');
    ensureAudio();
    setEQBypass(true);
    setEQBypass(false);
    expect(getStageBypass('eq')).toBe(false);
  });

  it('setEQBandGain is a no-op when audio not initialized', async () => {
    const { setEQBandGain } = await import('../app/lib/dsp');
    expect(() => setEQBandGain(0, 6)).not.toThrow();
  });
});
