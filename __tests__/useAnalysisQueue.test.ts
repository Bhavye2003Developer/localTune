/**
 * Tests for useAnalysisQueue hook.
 *
 * The hook manages a Web Worker, a Dexie DB, and dispatches to playerContext.
 * We mock all three external dependencies and test the queue's observable
 * behavior: pending count, serial processing, Dexie writes, dispatch calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { AnalysisResult } from '../app/types/analysis';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock Dexie db — just enough surface area for the hook
vi.mock('../app/lib/db', () => ({
  db: {
    tracks: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(1),
      modify: vi.fn().mockResolvedValue(1),
    },
    fileBlobs: {
      get: vi.fn().mockResolvedValue({ blob: new Blob([new ArrayBuffer(1024)]) }),
    },
  },
}));

// Worker mock — captures the onmessage handler and exposes simulateResult
let workerOnMessage: ((e: MessageEvent) => void) | null = null;
const mockWorkerPostMessage = vi.fn();

class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    workerOnMessage = (e) => this.onmessage?.(e);
  }
  postMessage = mockWorkerPostMessage;
  terminate = vi.fn();
}

// Inject MockWorker into the module before it's imported
vi.stubGlobal('Worker', MockWorker);

// OfflineAudioContext is not in jsdom — stub a minimal version
const mockGetChannelData = vi.fn(() => new Float32Array(100));
const mockDecodeAudioData = vi.fn().mockResolvedValue({
  sampleRate: 44100,
  numberOfChannels: 2,
  getChannelData: mockGetChannelData,
});
vi.stubGlobal('OfflineAudioContext', class {
  decodeAudioData = mockDecodeAudioData;
});

// Import hook AFTER mocks are in place
const { useAnalysisQueue } = await import('../app/lib/useAnalysisQueue');

// Helper to simulate a worker result arriving
function simulateWorkerResult(fileId: string, result: AnalysisResult) {
  workerOnMessage?.({ data: { fileId, result } } as MessageEvent);
}
function simulateWorkerError(fileId: string, error: string) {
  workerOnMessage?.({ data: { fileId, error } } as MessageEvent);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

const RESULT: AnalysisResult = {
  bpm: 128, key: 'C', keyScale: 'major', camelot: '8B',
  energy: 0.8, danceability: 0.7, mood: 'Energetic', lufs: -14,
};

describe('useAnalysisQueue', () => {
  const dispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    workerOnMessage = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts with pending=0 and total=0 when no tracks need analysis', () => {
    const { result } = renderHook(() =>
      useAnalysisQueue([], dispatch)
    );

    expect(result.current.pending).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it('enqueues tracks that have no analysis result', async () => {
    // Track.id === fileId in the real app (format: "filename-size")
    const tracks = [
      { id: 'track-a.mp3-1000', bpm: undefined },
      { id: 'track-b.mp3-2000', bpm: undefined },
    ];

    const { result } = renderHook(() =>
      useAnalysisQueue(tracks as never, dispatch)
    );

    await waitFor(() => {
      expect(result.current.total).toBe(2);
    });
  });

  it('does not enqueue tracks that already have a bpm value', async () => {
    const tracks = [
      { id: 'track-a.mp3-1000', bpm: 120 },
      { id: 'track-b.mp3-2000', bpm: undefined },
    ];

    const { result } = renderHook(() =>
      useAnalysisQueue(tracks as never, dispatch)
    );

    await waitFor(() => {
      expect(result.current.total).toBe(1);
    });
  });

  it('dispatches UPDATE_TRACK_ANALYSIS when worker returns a result', async () => {
    const fileId = 'track-a.mp3-1000';
    const tracks = [{ id: fileId, bpm: undefined }];

    renderHook(() => useAnalysisQueue(tracks as never, dispatch));

    await waitFor(() => expect(mockWorkerPostMessage).toHaveBeenCalled());

    act(() => simulateWorkerResult(fileId, RESULT));

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_TRACK_ANALYSIS',
          id: fileId,
          analysis: RESULT,
        })
      );
    });
  });

  it('decrements pending count after worker returns', async () => {
    const fileId = 'track-a.mp3-1000';
    const tracks = [{ id: fileId, bpm: undefined }];

    const { result } = renderHook(() =>
      useAnalysisQueue(tracks as never, dispatch)
    );

    await waitFor(() => expect(result.current.pending).toBe(1));

    act(() => simulateWorkerResult(fileId, RESULT));

    await waitFor(() => {
      expect(result.current.pending).toBe(0);
    });
  });

  it('continues queue after worker error (does not stall)', async () => {
    const tracks = [
      { id: 'track-a.mp3-1000', bpm: undefined },
      { id: 'track-b.mp3-2000', bpm: undefined },
    ];

    const { result } = renderHook(() =>
      useAnalysisQueue(tracks as never, dispatch)
    );

    await waitFor(() => expect(mockWorkerPostMessage).toHaveBeenCalledTimes(1));

    // Error on first track — queue should process next
    act(() => simulateWorkerError('track-a.mp3-1000', 'decode failed'));

    await waitFor(() => {
      expect(result.current.pending).toBeLessThan(2);
    });
  });
});
