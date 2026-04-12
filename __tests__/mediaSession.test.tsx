import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../app/lib/db', () => ({
  db: {
    tracks: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          modify: vi.fn().mockResolvedValue(0),
        })),
      })),
      add: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

const mockJsmediatags = vi.fn((_file: unknown, { onError }: { onError: () => void }) => onError());

vi.mock('jsmediatags', () => ({
  default: {
    read: mockJsmediatags,
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

type MockMediaSession = {
  metadata: { title: string; artist: string; album: string; artwork: { src: string }[] } | null;
  playbackState: string;
  setActionHandler: ReturnType<typeof vi.fn>;
  _handlers: Record<string, ((e?: { seekTime?: number }) => void) | null>;
};

let mockMediaSession: MockMediaSession;

function makeMockAudioContext() {
  return {
    createAnalyser: vi.fn(() => ({ fftSize: 0, connect: vi.fn() })),
    createGain: vi.fn(() => ({ gain: { value: 1 }, connect: vi.fn() })),
    createMediaElementSource: vi.fn(() => ({ connect: vi.fn() })),
    createBiquadFilter: vi.fn(() => ({
      frequency: { value: 0 },
      gain: { value: 0 },
      Q: { value: 0 },
      type: 'peaking',
      connect: vi.fn(),
    })),
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

class MockAudio {
  src = '';
  currentTime = 0;
  playbackRate = 1;
  preservesPitch = true;
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  pause = vi.fn();
  play = vi.fn().mockResolvedValue(undefined);
  load = vi.fn();
}

// Renders PlayerProvider, loads one track, plays it, waits for effects.
// Returns the player context value.
async function renderWithTrack(coverUrl = '') {
  // Patch jsmediatags to return metadata (including optional coverUrl)
  mockJsmediatags.mockImplementation(
    (_file: unknown, { onSuccess }: { onSuccess: (tag: unknown) => void }) => {
      const picture = coverUrl
        ? { data: [0x89, 0x50], format: 'image/jpeg' }
        : undefined;
      onSuccess({ tags: { title: 'Test Song', artist: 'Test Artist', album: 'Test Album', picture } });
    }
  );

  // Also mock URL.createObjectURL for cover art blob
  const origCreate = URL.createObjectURL;
  URL.createObjectURL = vi.fn(() => coverUrl || 'blob:mock');
  URL.revokeObjectURL = vi.fn();

  const { PlayerProvider, usePlayer } = await import('../app/lib/playerContext');

  let playerRef!: ReturnType<typeof usePlayer>;
  function Capture() {
    playerRef = usePlayer();
    return null;
  }

  render(
    <PlayerProvider>
      <Capture />
    </PlayerProvider>
  );

  const mockFile = new File(['audio'], 'song.mp3', { type: 'audio/mpeg' });
  Object.defineProperty(mockFile, 'size', { value: 12345 });

  await act(async () => {
    await playerRef.loadFiles([mockFile]);
  });

  await act(async () => {
    playerRef.playNow('song.mp3-12345');
  });

  // Flush remaining effects
  await act(async () => {});

  URL.createObjectURL = origCreate;
  return playerRef;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PlayerProvider — Media Session', () => {
  beforeEach(() => {
    vi.resetModules();

    vi.stubGlobal('Audio', MockAudio);
    vi.stubGlobal('AudioContext', vi.fn(makeMockAudioContext));
    vi.stubGlobal('MediaMetadata', class {
      title: string; artist: string; album: string; artwork: { src: string; sizes: string; type: string }[];
      constructor(init: { title: string; artist: string; album: string; artwork: { src: string; sizes: string; type: string }[] }) {
        this.title = init.title;
        this.artist = init.artist;
        this.album = init.album;
        this.artwork = init.artwork;
      }
    });

    mockMediaSession = {
      metadata: null,
      playbackState: 'none',
      _handlers: {},
      setActionHandler: vi.fn((action, handler) => {
        mockMediaSession._handlers[action] = handler;
      }),
    };
    Object.defineProperty(navigator, 'mediaSession', {
      value: mockMediaSession,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets metadata title, artist, album on track load', async () => {
    await renderWithTrack();
    expect(mockMediaSession.metadata?.title).toBe('Test Song');
    expect(mockMediaSession.metadata?.artist).toBe('Test Artist');
    expect(mockMediaSession.metadata?.album).toBe('Test Album');
  });

  it('passes coverUrl as artwork when present', async () => {
    await renderWithTrack('blob:cover-url');
    expect(mockMediaSession.metadata?.artwork[0]?.src).toBe('blob:cover-url');
  });

  it('passes empty artwork array when coverUrl is empty', async () => {
    await renderWithTrack('');
    expect(mockMediaSession.metadata?.artwork).toEqual([]);
  });

  it('sets playbackState to "playing" when track is playing', async () => {
    await renderWithTrack();
    expect(mockMediaSession.playbackState).toBe('playing');
  });

  it('sets playbackState to "paused" when track is paused', async () => {
    const player = await renderWithTrack();
    await act(async () => {
      player.togglePlay(); // togglePlay pauses since we're currently playing
    });
    await act(async () => {});
    expect(mockMediaSession.playbackState).toBe('paused');
  });

  it('registers all five action handlers', async () => {
    await renderWithTrack();
    const registered = mockMediaSession.setActionHandler.mock.calls.map((c: unknown[]) => c[0]);
    expect(registered).toContain('play');
    expect(registered).toContain('pause');
    expect(registered).toContain('previoustrack');
    expect(registered).toContain('nexttrack');
    expect(registered).toContain('seekto');
  });

  it('seekto handler does not throw when called with seekTime', async () => {
    await renderWithTrack();
    expect(() => mockMediaSession._handlers['seekto']?.({ seekTime: 42 })).not.toThrow();
  });

  it('no-op on browsers without mediaSession (no throw)', async () => {
    Object.defineProperty(navigator, 'mediaSession', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    await expect(renderWithTrack()).resolves.not.toThrow();
  });
});
