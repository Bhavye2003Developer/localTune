/**
 * useGaplessScheduler tests
 *
 * Web Audio API is not available in jsdom. We mock the module-level accessors
 * from playerContext, then drive the scheduler via fake timers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Fake gain node factory ────────────────────────────────────────────────────
// Returns an object shaped like a GainNode: { gain: AudioParam-like, calls[] }
// The hook accesses node.gain.setValueAtTime / setTargetAtTime.

type GainCall = { method: string; args: unknown[] };

const makeGainNode = (initialGain = 1) => {
  const calls: GainCall[] = [];
  return {
    gain: {
      value: initialGain,
      setValueAtTime:  (...a: unknown[]) => calls.push({ method: 'setValueAtTime',  args: a }),
      setTargetAtTime: (...a: unknown[]) => calls.push({ method: 'setTargetAtTime', args: a }),
    },
    connect: vi.fn(),
    calls,
  };
};

// ─── Mutable state shared across tests ───────────────────────────────────────

let mockCurrentTime = 0;
let mockDuration    = 0;

const mockAudioEl = {
  get currentTime() { return mockCurrentTime; },
  get duration()    { return mockDuration; },
};

let mockMediaElGain = makeGainNode(1);
let mockGaplessGain = makeGainNode(0);

// AudioBufferSourceNode mock
const makeSourceNode = () => ({
  buffer: null as AudioBuffer | null,
  connect: vi.fn(),
  start:   vi.fn(),
  stop:    vi.fn(),
  onended: null as ((e: Event) => void) | null,
});
let lastSourceNode = makeSourceNode();

const mockAudioCtx = {
  get currentTime() { return mockCurrentTime; },
  state: 'running' as AudioContextState,
  resume: vi.fn().mockResolvedValue(undefined),
  decodeAudioData: vi.fn(),
  createBufferSource: vi.fn(() => {
    lastSourceNode = makeSourceNode();
    return lastSourceNode;
  }),
};

const mockAudioBuffer = { duration: 180, sampleRate: 44100 } as unknown as AudioBuffer;

// ─── Module mock — replaces playerContext accessors ───────────────────────────

vi.mock('../app/lib/playerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../app/lib/playerContext')>();
  return {
    ...real,
    getAudioEl:              () => mockAudioEl,
    getAudioCtx:             () => mockAudioCtx,
    getMediaElementGainNode: () => mockMediaElGain as unknown as GainNode,
    getGaplessGainNode:      () => mockGaplessGain as unknown as GainNode,
  };
});

// Import hook after mocks are registered
import { useGaplessScheduler } from '../app/lib/useGaplessScheduler';
import type { PlayerState, Track } from '../app/lib/playerContext';
import { INITIAL } from '../app/lib/playerContext';

// ─── State helpers ────────────────────────────────────────────────────────────

const makeTrack = (id: string, duration = 200): Track => ({
  id, name: `${id}.mp3`, title: id, artist: '', album: '',
  size: 1000, type: 'audio/mpeg', url: `blob:${id}`, coverUrl: '', duration,
});

const stateWith = (ids: string[], pos: number, loopMode: PlayerState['loopMode'] = 'off'): PlayerState => ({
  ...INITIAL,
  tracks: ids.map(id => makeTrack(id)),
  queue: ids,
  queuePos: pos,
  loopMode,
  playing: true,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useGaplessScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockCurrentTime = 0;
    mockDuration    = 0;
    mockMediaElGain = makeGainNode(1);
    mockGaplessGain = makeGainNode(0);
    mockAudioCtx.decodeAudioData.mockResolvedValue(mockAudioBuffer);
    mockAudioCtx.resume.mockResolvedValue(undefined);
    mockAudioCtx.createBufferSource.mockImplementation(() => {
      lastSourceNode = makeSourceNode();
      return lastSourceNode;
    });

    // Mock fetch to return a fake ArrayBuffer (hook uses fetch to read blob URL)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // ── No-ops ─────────────────────────────────────────────────────────────────

  it('does nothing when gapless is disabled', async () => {
    const state = stateWith(['a', 'b'], 0);
    mockDuration    = 200;
    mockCurrentTime = 198;

    await act(async () => {
      renderHook(() => useGaplessScheduler({ state, enabled: false, crossfade: 0 }));
      await vi.runAllTimersAsync();
    });

    expect(mockAudioCtx.decodeAudioData).not.toHaveBeenCalled();
  });

  it('does nothing when there is no next track (single track, loop off)', async () => {
    const state = stateWith(['a'], 0, 'off');
    mockDuration    = 200;
    mockCurrentTime = 198;

    await act(async () => {
      renderHook(() => useGaplessScheduler({ state, enabled: true, crossfade: 0 }));
      await vi.runAllTimersAsync();
    });

    expect(mockAudioCtx.decodeAudioData).not.toHaveBeenCalled();
  });

  it('does nothing when not playing', async () => {
    const state = { ...stateWith(['a', 'b'], 0), playing: false };
    mockDuration    = 200;
    mockCurrentTime = 198;

    await act(async () => {
      renderHook(() => useGaplessScheduler({ state, enabled: true, crossfade: 0 }));
      await vi.runAllTimersAsync();
    });

    expect(mockAudioCtx.decodeAudioData).not.toHaveBeenCalled();
  });

  // ── Pre-decode trigger ──────────────────────────────────────────────────────

  it('does not decode when well before the 3s pre-decode window', async () => {
    const state = stateWith(['a', 'b'], 0);
    mockDuration    = 200;
    mockCurrentTime = 10; // 190s remaining — far from window

    await act(async () => {
      renderHook(() => useGaplessScheduler({ state, enabled: true, crossfade: 0 }));
      await vi.runAllTimersAsync();
    });

    expect(mockAudioCtx.decodeAudioData).not.toHaveBeenCalled();
  });

  it('starts decoding when position enters the 3s window', async () => {
    const state = stateWith(['a', 'b'], 0);
    mockDuration    = 200;
    mockCurrentTime = 197.5; // 2.5s remaining — inside window

    await act(async () => {
      renderHook(() => useGaplessScheduler({ state, enabled: true, crossfade: 0 }));
      await vi.runAllTimersAsync();
    });

    expect(mockAudioCtx.decodeAudioData).toHaveBeenCalledTimes(1);
  });

  // ── Scheduling ─────────────────────────────────────────────────────────────

  it('creates and starts an AudioBufferSourceNode when buffer is ready and close to end', async () => {
    const state = stateWith(['a', 'b'], 0);
    mockDuration    = 200;
    mockCurrentTime = 198.5; // inside 3s window AND inside schedule window

    await act(async () => {
      renderHook(() => useGaplessScheduler({ state, enabled: true, crossfade: 0 }));
      await vi.runAllTimersAsync();
    });

    expect(mockAudioCtx.createBufferSource).toHaveBeenCalled();
    expect(lastSourceNode.connect).toHaveBeenCalled();
    expect(lastSourceNode.start).toHaveBeenCalled();
  });

  // ── Crossfade = 0: hard cut ────────────────────────────────────────────────

  it('uses setValueAtTime for a hard cut when crossfade is 0', async () => {
    const state = stateWith(['a', 'b'], 0);
    mockDuration    = 200;
    mockCurrentTime = 198.5;

    await act(async () => {
      renderHook(() => useGaplessScheduler({ state, enabled: true, crossfade: 0 }));
      await vi.runAllTimersAsync();
    });

    // Hard cut: mediaEl gain → 0 and gapless gain → 1 via setValueAtTime
    expect(mockMediaElGain.calls.some(c => c.method === 'setValueAtTime' && c.args[0] === 0)).toBe(true);
    expect(mockGaplessGain.calls.some(c => c.method === 'setValueAtTime' && c.args[0] === 1)).toBe(true);
  });

  // ── Crossfade > 0: smooth ramp ─────────────────────────────────────────────

  it('uses setTargetAtTime for smooth ramp when crossfade > 0', async () => {
    const state = stateWith(['a', 'b'], 0);
    mockDuration    = 200;
    mockCurrentTime = 198.5;

    await act(async () => {
      renderHook(() => useGaplessScheduler({ state, enabled: true, crossfade: 2 }));
      await vi.runAllTimersAsync();
    });

    expect(mockMediaElGain.calls.some(c => c.method === 'setTargetAtTime')).toBe(true);
    expect(mockGaplessGain.calls.some(c => c.method === 'setTargetAtTime')).toBe(true);
  });

  // ── Cancellation on track change ───────────────────────────────────────────

  it('discards decoded buffer when track changes mid-decode', async () => {
    const state1 = stateWith(['a', 'b'], 0);
    mockDuration    = 200;
    mockCurrentTime = 197;

    // Decode hangs until we resolve manually
    let resolveDecode!: (b: AudioBuffer) => void;
    mockAudioCtx.decodeAudioData.mockReturnValue(
      new Promise<AudioBuffer>(r => { resolveDecode = r; })
    );

    const { rerender } = renderHook(
      ({ s }: { s: PlayerState }) =>
        useGaplessScheduler({ state: s, enabled: true, crossfade: 0 }),
      { initialProps: { s: state1 } }
    );

    // Let the interval fire a few times so decode is triggered (not runAllTimers — interval is infinite)
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(mockAudioCtx.decodeAudioData).toHaveBeenCalledTimes(1);

    // Track changes — effect re-runs with new state, cancels old decode
    const state2 = stateWith(['c', 'd'], 0);
    rerender({ s: state2 });

    // Resolve the stale decode — must be ignored (cancelled = true)
    await act(async () => {
      resolveDecode(mockAudioBuffer);
      await vi.advanceTimersByTimeAsync(200);
    });

    // createBufferSource must NOT have been called from the cancelled decode
    expect(mockAudioCtx.createBufferSource).not.toHaveBeenCalled();
  });

  // ── Seek back re-arm ────────────────────────────────────────────────────────

  it('re-arms decode after user seeks back from near-end to middle', async () => {
    const state = stateWith(['a', 'b'], 0);
    mockDuration    = 200;
    mockCurrentTime = 197; // inside 3s window, outside 1.5s schedule window

    const { rerender } = renderHook(
      ({ t }: { t: number }) => {
        mockCurrentTime = t;
        return useGaplessScheduler({ state, enabled: true, crossfade: 0 });
      },
      { initialProps: { t: 197 } }
    );

    // First approach → decode fires
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    const callsAfterFirst = mockAudioCtx.decodeAudioData.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThanOrEqual(1);

    // User seeks back to middle — interval sees remaining = 190 > 3, resets wasInWindow
    rerender({ t: 10 });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });

    // Second approach to end — decode should fire again
    rerender({ t: 197 });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });

    expect(mockAudioCtx.decodeAudioData.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });
});
