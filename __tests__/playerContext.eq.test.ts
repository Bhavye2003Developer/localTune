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

function makeMockAudioContext() {
  mockBiquadNodes = [];
  return {
    createAnalyser: vi.fn(() => ({ fftSize: 0, connect: vi.fn() })),
    createGain: vi.fn(() => ({ gain: { value: 1 }, connect: vi.fn() })),
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
    state: 'running',
    resume: vi.fn(),
    destination: {},
  };
}

describe('playerContext EQ audio chain', () => {
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

  it('ensureAudio creates 10 BiquadFilterNodes', async () => {
    const { ensureAudio } = await import('../app/lib/playerContext');
    ensureAudio();
    expect(mockBiquadNodes).toHaveLength(10);
  });

  it('BiquadFilterNodes have correct freq / Q / type from INITIAL_BANDS', async () => {
    const { ensureAudio } = await import('../app/lib/playerContext');
    ensureAudio();
    INITIAL_BANDS.forEach((band, i) => {
      expect(mockBiquadNodes[i].frequency.value).toBe(band.freq);
      expect(mockBiquadNodes[i].Q.value).toBe(band.q);
      expect(mockBiquadNodes[i].type).toBe(band.type);
    });
  });

  it('setEQBandGain sets gain on the correct node', async () => {
    const { ensureAudio, setEQBandGain } = await import('../app/lib/playerContext');
    ensureAudio();
    setEQBandGain(3, 8);
    expect(mockBiquadNodes[3].gain.value).toBe(8);
    expect(mockBiquadNodes[0].gain.value).toBe(0); // others unchanged
  });

  it('setEQBypass(true) zeros all node gains', async () => {
    const { ensureAudio, setEQBandGain, setEQBypass } = await import('../app/lib/playerContext');
    ensureAudio();
    setEQBandGain(0, 6);
    setEQBandGain(4, -3);
    setEQBypass(true);
    expect(mockBiquadNodes.every(n => n.gain.value === 0)).toBe(true);
  });

  it('setEQBypass(false) restores prior gains', async () => {
    const { ensureAudio, setEQBandGain, setEQBypass } = await import('../app/lib/playerContext');
    ensureAudio();
    setEQBandGain(0, 6);
    setEQBandGain(4, -3);
    setEQBypass(true);
    setEQBypass(false);
    expect(mockBiquadNodes[0].gain.value).toBe(6);
    expect(mockBiquadNodes[4].gain.value).toBe(-3);
  });

  it('setEQBandGain is a no-op when audio not initialized', async () => {
    const { setEQBandGain } = await import('../app/lib/playerContext');
    expect(() => setEQBandGain(0, 6)).not.toThrow();
  });
});
