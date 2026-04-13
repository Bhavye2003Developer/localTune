/**
 * decodeWorker.ts — Web Worker for off-main-thread ArrayBuffer fetch.
 *
 * Receives: { blobUrl: string; trackId: string }
 * Posts back: { arrayBuffer: ArrayBuffer; trackId: string }  (arrayBuffer transferred)
 * Posts error: { error: string; trackId: string }
 *
 * The main thread then calls audioCtx.decodeAudioData(arrayBuffer) — AudioContext
 * is Window-only so decoding happens on the main thread, but fetch I/O is here.
 *
 * Usage (main thread):
 *   const worker = new Worker(new URL('./decodeWorker.ts', import.meta.url));
 *   worker.postMessage({ blobUrl: track.url, trackId: track.id });
 *   worker.onmessage = ({ data }) => { ... };
 */

self.onmessage = async (e: MessageEvent<{ blobUrl: string; trackId: string }>) => {
  const { blobUrl, trackId } = e.data;
  try {
    const res         = await fetch(blobUrl);
    const arrayBuffer = await res.arrayBuffer();
    // Transfer the buffer to avoid copying — caller must not use the original
    (self as unknown as Worker).postMessage({ arrayBuffer, trackId }, [arrayBuffer]);
  } catch (err) {
    (self as unknown as Worker).postMessage({
      error: err instanceof Error ? err.message : String(err),
      trackId,
    });
  }
};
