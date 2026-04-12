'use client';

/**
 * useAnalysisQueue — background analysis queue for essentia.js BPM/Key/Mood/Energy.
 *
 * - Creates one Web Worker for the session.
 * - Processes tracks one-at-a-time (serialised queue).
 * - Reads file blobs from Dexie, decodes to Float32Array, posts to worker.
 * - On result: writes analysis fields to db.tracks, dispatches UPDATE_TRACK_ANALYSIS.
 * - Exposes { pending, total } for progress display.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { db } from './db';
import type { Track } from './playerContext';
import type { AnalysisResult } from '../types/analysis';

export interface AnalysisAction {
  type: 'UPDATE_TRACK_ANALYSIS';
  id: string;
  analysis: AnalysisResult;
}

interface QueueEntry {
  trackId: string;   // Track.id  (== fileId)
  fileId: string;
}

const OFFLINE_SR = 22050; // lower SR sufficient for analysis, faster decode

async function blobToChannels(
  blob: Blob,
): Promise<{ left: Float32Array; right: Float32Array; sampleRate: number }> {
  const arrayBuffer = await blob.arrayBuffer();
  // OfflineAudioContext is available in workers and main thread
  const ctx = new OfflineAudioContext(2, 1, OFFLINE_SR);
  const decoded = await ctx.decodeAudioData(arrayBuffer);

  const sampleRate = decoded.sampleRate;
  const left = decoded.getChannelData(0);
  const right = decoded.numberOfChannels > 1 ? decoded.getChannelData(1) : left;

  return {
    left: Float32Array.from(left),
    right: Float32Array.from(right),
    sampleRate,
  };
}

export function useAnalysisQueue(
  tracks: Track[],
  dispatch: (action: AnalysisAction) => void,
): { pending: number; total: number } {
  const workerRef = useRef<Worker | null>(null);
  const queueRef = useRef<QueueEntry[]>([]);
  const processingRef = useRef<string | null>(null); // fileId being processed
  const enqueuedIds = useRef<Set<string>>(new Set());

  const [pending, setPending] = useState(0);
  const [total, setTotal] = useState(0);

  // Stable reference so processNext can call itself without stale closure
  const processNextRef = useRef<() => void>(() => {});

  const trackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advanceQueue = useCallback(() => {
    if (trackTimeoutRef.current) {
      clearTimeout(trackTimeoutRef.current);
      trackTimeoutRef.current = null;
    }
    processingRef.current = null;
    setPending(p => Math.max(0, p - 1));
    processNextRef.current();
  }, []);

  const processNext = useCallback(() => {
    if (processingRef.current !== null) return; // already busy
    const entry = queueRef.current.shift();
    if (!entry) return;

    processingRef.current = entry.fileId;

    // 90s safety timeout — if the worker never responds (e.g. WASM crash),
    // skip this track so the queue doesn't stall forever.
    trackTimeoutRef.current = setTimeout(() => {
      if (processingRef.current === entry.fileId) {
        console.warn('[AnalysisQueue] timeout on', entry.fileId, '— skipping');
        advanceQueue();
      }
    }, 90_000);

    (async () => {
      try {
        const blobRecord = await db.fileBlobs.get(entry.fileId);
        if (!blobRecord) throw new Error('blob not found');

        const { left, right, sampleRate } = await blobToChannels(blobRecord.blob);

        workerRef.current?.postMessage(
          { fileId: entry.fileId, left, right, sampleRate },
          [left.buffer, right.buffer],
        );
      } catch (err) {
        console.warn('[AnalysisQueue] pre-send error for', entry.fileId, err);
        advanceQueue();
      }
    })();
  }, [advanceQueue]);

  // Keep stable refs in sync
  const advanceQueueRef = useRef(advanceQueue);
  useEffect(() => {
    processNextRef.current = processNext;
    advanceQueueRef.current = advanceQueue;
  }, [processNext, advanceQueue]);

  // Create worker once on mount
  useEffect(() => {
    if (typeof Worker === 'undefined') return; // SSR / test environments without Worker stub

    const worker = new Worker(
      new URL('./analysisWorker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = async (
      e: MessageEvent<{ fileId: string; result?: AnalysisResult; error?: string }>,
    ) => {
      const { fileId, result, error } = e.data;

      if (result && !error) {
        // Persist to Dexie
        try {
          await db.tracks
            .where('fileId').equals(fileId)
            .modify({
              bpm: result.bpm,
              musicalKey: result.key,
              keyScale: result.keyScale,
              camelot: result.camelot,
              energy: result.energy,
              danceability: result.danceability,
              mood: result.mood,
              lufs: result.lufs,
            });
        } catch {
          // Non-fatal — data still dispatched to in-memory state
        }

        dispatch({ type: 'UPDATE_TRACK_ANALYSIS', id: fileId, analysis: result });
      } else if (error) {
        console.warn('[AnalysisQueue] worker error for', fileId, error);
      }

      advanceQueueRef.current();
    };

    worker.onerror = (e) => {
      console.error('[AnalysisQueue] worker crash:', e.message);
      advanceQueueRef.current();
    };

    workerRef.current = worker;

    return () => {
      if (trackTimeoutRef.current) clearTimeout(trackTimeoutRef.current);
      worker.terminate();
      workerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Enqueue newly added unanalyzed tracks
  useEffect(() => {
    const newEntries: QueueEntry[] = [];

    for (const track of tracks) {
      if (track.bpm != null) continue;          // already analysed
      if (enqueuedIds.current.has(track.id)) continue; // already queued

      enqueuedIds.current.add(track.id);
      newEntries.push({ trackId: track.id, fileId: track.id });
    }

    if (newEntries.length === 0) return;

    queueRef.current.push(...newEntries);
    setPending(p => p + newEntries.length);
    setTotal(t => t + newEntries.length);

    // Kick off processing if idle
    processNextRef.current();
  }, [tracks]);

  return { pending, total };
}
