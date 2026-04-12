'use client';

import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import jsmediatags from 'jsmediatags';
import { toast } from 'sonner';
import { db } from './db';

const BLOB_STORAGE_LIMIT = 150 * 1024 * 1024; // 150 MB
import {
  initDSP,
  loadDSPSettings,
  applyLoadedSettings,
  setEQBandGain as dspSetEQBandGain,
  setEQBypass as dspSetEQBypass,
  setReplayGain,
} from './dsp';

// ─── Track type ───────────────────────────────────────────────────────────────

export interface Track {
  id: string;
  name: string;
  title: string;
  artist: string;
  album: string;
  size: number;
  type: string;
  url: string;
  coverUrl: string;
  duration: number;
  error?: boolean;
}

// ─── Shuffle / loop modes ─────────────────────────────────────────────────────

export type ShuffleMode = 'off' | 'random';
export type LoopMode = 'off' | 'track' | 'queue';

// ─── State ────────────────────────────────────────────────────────────────────

export interface PlayerState {
  tracks: Track[];
  queue: string[];
  queuePos: number;
  playing: boolean;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  speed: number;
  loopA: number | null;
  loopB: number | null;
  loopActive: boolean;
  shuffleMode: ShuffleMode;
  loopMode: LoopMode;
  history: string[];
}

export const INITIAL: PlayerState = {
  tracks: [],
  queue: [],
  queuePos: -1,
  playing: false,
  position: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  speed: 1,
  loopA: null,
  loopB: null,
  loopActive: false,
  shuffleMode: 'off',
  loopMode: 'off',
  history: [],
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'ADD_TRACKS'; tracks: Track[] }
  | { type: 'UPDATE_TRACK'; id: string; patch: Partial<Track> }
  | { type: 'REMOVE_TRACK'; id: string }
  | { type: 'PLAY_NOW'; id: string }
  | { type: 'PLAY_NEXT'; id: string }
  | { type: 'ADD_TO_QUEUE'; id: string }
  | { type: 'REMOVE_FROM_QUEUE'; pos: number }
  | { type: 'CLEAR_QUEUE' }
  | { type: 'REORDER_QUEUE'; from: number; to: number }
  | { type: 'NEXT_TRACK' }
  | { type: 'PREV_TRACK' }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'TICK'; position: number; duration: number }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'SET_LOOP_A'; a: number }
  | { type: 'SET_LOOP_B'; b: number }
  | { type: 'TOGGLE_LOOP' }
  | { type: 'CLEAR_LOOP' }
  | { type: 'CYCLE_SHUFFLE' }
  | { type: 'CYCLE_LOOP_MODE' }
  | { type: 'TRACK_ENDED' }
  | { type: 'PUSH_HISTORY'; id: string };

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function reducer(state: PlayerState, action: Action): PlayerState {
  switch (action.type) {

    case 'ADD_TRACKS':
      return { ...state, tracks: [...state.tracks, ...action.tracks] };

    case 'UPDATE_TRACK':
      return {
        ...state,
        tracks: state.tracks.map(t => t.id === action.id ? { ...t, ...action.patch } : t),
      };

    case 'REMOVE_TRACK': {
      const newTracks = state.tracks.filter(t => t.id !== action.id);
      const newQueue  = state.queue.filter(id => id !== action.id);
      const currentId = state.queue[state.queuePos] ?? null;
      if (currentId === action.id) {
        // Deleted the playing track — full reset
        return { ...state, tracks: newTracks, queue: [], queuePos: -1, playing: false, position: 0, duration: 0 };
      }
      // Not playing — keep pointer correct
      const removedAt  = state.queue.indexOf(action.id);
      let newQueuePos  = state.queuePos;
      if (removedAt !== -1 && removedAt < state.queuePos) newQueuePos--;
      if (newQueue.length === 0) newQueuePos = -1;
      else newQueuePos = Math.min(newQueuePos, newQueue.length - 1);
      return { ...state, tracks: newTracks, queue: newQueue, queuePos: newQueuePos };
    }

    case 'PLAY_NOW': {
      const currentId = state.queue[state.queuePos];
      const newHistory = currentId
        ? [...state.history, currentId].slice(-50)
        : state.history;
      return { ...state, queue: [action.id], queuePos: 0, playing: true, position: 0, history: newHistory };
    }

    case 'PLAY_NEXT': {
      const insertAt = state.queuePos + 1;
      const q = [...state.queue];
      q.splice(insertAt, 0, action.id);
      return { ...state, queue: q };
    }

    case 'ADD_TO_QUEUE':
      return { ...state, queue: [...state.queue, action.id] };

    case 'REMOVE_FROM_QUEUE': {
      const q = state.queue.filter((_, i) => i !== action.pos);
      if (action.pos === state.queuePos) {
        // Removing currently playing track — stop playback
        return { ...state, queue: q, queuePos: q.length > 0 ? Math.min(action.pos, q.length - 1) : -1, playing: false, position: 0 };
      }
      const qPos = action.pos < state.queuePos ? state.queuePos - 1 : state.queuePos;
      return { ...state, queue: q, queuePos: Math.min(qPos, q.length - 1) };
    }

    case 'CLEAR_QUEUE':
      return { ...state, queue: [], queuePos: -1, playing: false };

    case 'REORDER_QUEUE': {
      const q = [...state.queue];
      const [item] = q.splice(action.from, 1);
      q.splice(action.to, 0, item);
      const currentId = state.queue[state.queuePos];
      const newPos = currentId ? q.indexOf(currentId) : state.queuePos;
      return { ...state, queue: q, queuePos: newPos };
    }

    case 'NEXT_TRACK': {
      const currentId = state.queue[state.queuePos];
      const next = state.queuePos + 1;
      if (next < state.queue.length) {
        const newHistory = currentId ? [...state.history, currentId].slice(-50) : state.history;
        return { ...state, queuePos: next, playing: true, position: 0, history: newHistory };
      }
      if (state.loopMode === 'queue') {
        const newHistory = currentId ? [...state.history, currentId].slice(-50) : state.history;
        return { ...state, queuePos: 0, playing: true, position: 0, history: newHistory };
      }
      return { ...state, playing: false }; // no transition — do not push history
    }

    case 'PREV_TRACK': {
      if (state.queuePos > 0) {
        return { ...state, queuePos: state.queuePos - 1, playing: true, position: 0 };
      }
      if (state.history.length > 0) {
        const prev = state.history[state.history.length - 1];
        const newHistory = state.history.slice(0, -1);
        return { ...state, queue: [prev, ...state.queue], queuePos: 0, playing: true, position: 0, history: newHistory };
      }
      return state;
    }

    case 'SET_PLAYING':
      return { ...state, playing: action.playing };

    case 'TICK':
      return { ...state, position: action.position, duration: action.duration };

    case 'SET_VOLUME':
      return { ...state, volume: action.volume };

    case 'TOGGLE_MUTE':
      return { ...state, muted: !state.muted };

    case 'SET_SPEED':
      return { ...state, speed: action.speed };

    case 'SET_LOOP_A':
      return { ...state, loopA: action.a };

    case 'SET_LOOP_B':
      return { ...state, loopB: action.b };

    case 'TOGGLE_LOOP':
      return { ...state, loopActive: !state.loopActive };

    case 'CLEAR_LOOP':
      return { ...state, loopA: null, loopB: null, loopActive: false };

    case 'CYCLE_SHUFFLE': {
      if (state.shuffleMode === 'off') {
        const currentId = state.queue[state.queuePos];
        const rest = state.queue.filter((_, i) => i !== state.queuePos);
        const shuffled = shuffleArr(rest);
        const newQueue = currentId ? [currentId, ...shuffled] : shuffled;
        return { ...state, shuffleMode: 'random', queue: newQueue, queuePos: currentId ? 0 : state.queuePos };
      }
      // Turning shuffle off keeps the queue in its current (shuffled) order.
      // Restoring the original order would require storing a pre-shuffle snapshot — not in V1 scope.
      return { ...state, shuffleMode: 'off' };
    }

    case 'CYCLE_LOOP_MODE': {
      const modes: LoopMode[] = ['off', 'track', 'queue'];
      const next = modes[(modes.indexOf(state.loopMode) + 1) % modes.length];
      return { ...state, loopMode: next };
    }

    case 'TRACK_ENDED': {
      const { loopMode, queuePos, queue } = state;
      if (loopMode === 'track') return { ...state, playing: true, position: 0 };
      const currentId = queue[queuePos];
      const next = queuePos + 1;
      if (next < queue.length) {
        const newHistory = currentId ? [...state.history, currentId].slice(-50) : state.history;
        return { ...state, queuePos: next, playing: true, position: 0, history: newHistory };
      }
      if (loopMode === 'queue') {
        const newHistory = currentId ? [...state.history, currentId].slice(-50) : state.history;
        return { ...state, queuePos: 0, playing: true, position: 0, history: newHistory };
      }
      return { ...state, playing: false }; // queue ended — do not push history
    }

    case 'PUSH_HISTORY': {
      const newHistory = [...state.history, action.id].slice(-50);
      return { ...state, history: newHistory };
    }

    default:
      return state;
  }
}

// ─── Web Audio (module-level — survives re-renders, browser-only) ─────────────

let audioEl: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let _analyserNode: AnalyserNode | null = null;
let gainNode: GainNode | null = null;
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

// ─── FFmpeg lazy loader ───────────────────────────────────────────────────────

let ffmpegInstance: import('@ffmpeg/ffmpeg').FFmpeg | null = null;

async function transcodeToWebM(blobUrl: string, filename: string): Promise<string> {
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

  if (!ffmpegInstance) {
    const ff = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ff.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegInstance = ff; // only assign after successful load
  }

  const ff = ffmpegInstance;
  const ext = filename.split('.').pop() ?? 'bin';
  const inputName = `input_${Date.now()}.${ext}`;
  const outputName = `output_${Date.now()}.webm`;

  await ff.writeFile(inputName, await fetchFile(blobUrl));
  await ff.exec(['-i', inputName, '-c:a', 'libopus', '-b:a', '128k', outputName]);
  const data = await ff.readFile(outputName);

  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  return URL.createObjectURL(new Blob([data as Uint8Array<ArrayBuffer>], { type: 'audio/webm' }));
}

// Attach DOM events once, right after audioEl is created.
// Must receive dispatch since this runs outside React.
function attachAudioEvents(dispatch: React.Dispatch<Action>, getState: () => PlayerState) {
  if (!audioEl) return;
  const audio = audioEl;

  const onTime = () =>
    dispatch({ type: 'TICK', position: audio.currentTime, duration: audio.duration || 0 });
  const onEnded = () => {
    const { loopMode, queue } = getState();
    // When loopMode is 'track', or queue-loop with a single track, queuePos and
    // playing don't change in the reducer — the playback useEffect never re-fires.
    // Use setTimeout so the browser fully processes the 'ended' event before we
    // call play() — required on mobile Chrome/Safari where synchronous play()
    // inside 'ended' is silently dropped.
    if (loopMode === 'track' || (loopMode === 'queue' && queue.length === 1)) {
      setTimeout(() => {
        audio.currentTime = 0;
        audioCtx?.resume();
        audio.play().catch(() => {});
      }, 0);
    }
    dispatch({ type: 'TRACK_ENDED' });
  };
  const onMeta = () => {
    const dur = audio.duration;
    if (!isFinite(dur) || dur <= 0) return;
    const state = getState();
    const trackId = state.queue[state.queuePos];
    if (trackId) {
      dispatch({ type: 'UPDATE_TRACK', id: trackId, patch: { duration: dur } });
      db.tracks.where('fileId').equals(trackId).modify({ duration: dur }).catch(() => {});
    }
  };

  const onError = async () => {
    const state = getState();
    const trackId = state.queue[state.queuePos];
    const track = trackId ? state.tracks.find(t => t.id === trackId) : null;
    if (!track || track.error) return; // already failed or nothing loaded

    // Mark as converting immediately to prevent re-entry
    dispatch({ type: 'UPDATE_TRACK', id: track.id, patch: { error: true } });
    const toastId = toast.loading(`Converting ${track.name}…`);
    try {
      const newUrl = await transcodeToWebM(track.url, track.name);
      // Clear error and set new URL on success
      dispatch({ type: 'UPDATE_TRACK', id: track.id, patch: { url: newUrl, error: false } });
      audio.src = newUrl;
      audio.load();
      await audioCtx?.resume();
      await audio.play();
      toast.dismiss(toastId);
    } catch {
      toast.dismiss(toastId);
      toast.error(`Could not play ${track.name} — format not supported`);
      // error: true already set above, no need to dispatch again
    }
  };

  audio.addEventListener('timeupdate', onTime);
  audio.addEventListener('loadedmetadata', onMeta);
  audio.addEventListener('ended', onEnded);
  audio.addEventListener('error', onError);
}

// ─── ID3 metadata extraction ──────────────────────────────────────────────────

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

// ─── Context value type ───────────────────────────────────────────────────────

export interface PlayerContextValue {
  state: PlayerState;
  analyserNode: AnalyserNode | null;
  loadFiles: (files: FileList | File[]) => void;
  removeTrack: (id: string) => void;
  playNow: (id: string) => void;
  playNext: (id: string) => void;
  addToQueue: (id: string) => void;
  removeFromQueue: (pos: number) => void;
  clearQueue: () => void;
  reorderQueue: (from: number, to: number) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setSpeed: (s: number) => void;
  setLoopA: () => void;
  setLoopB: () => void;
  setLoopAAt: (s: number) => void;
  setLoopBAt: (s: number) => void;
  toggleLoop: () => void;
  clearLoop: () => void;
  cycleShuffle: () => void;
  cycleLoopMode: () => void;
  setEQBandGain: (index: number, gainDb: number) => void;
  setEQBypass: (on: boolean) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const getState = () => stateRef.current;

  // ── Restore persisted files from IndexedDB on mount ───────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedTracks, storedBlobs] = await Promise.all([
        db.tracks.toArray(),
        db.fileBlobs.toArray(),
      ]);
      if (cancelled || storedBlobs.length === 0) return;

      const blobMap = new Map(storedBlobs.map(b => [b.fileId, b.blob]));
      const tracks: Track[] = [];

      for (const st of storedTracks) {
        const blob = blobMap.get(st.fileId);
        if (!blob) continue;
        tracks.push({
          id: st.fileId,
          name: st.name,
          title: st.title,
          artist: st.artist ?? '',
          album: st.album ?? '',
          size: st.size,
          type: st.type,
          url: URL.createObjectURL(blob),
          coverUrl: '',
          duration: st.duration,
        });
      }

      if (cancelled || tracks.length === 0) return;

      const wasNull = !audioEl;
      ensureAudio();
      if (wasNull) attachAudioEvents(dispatch, getState);

      dispatch({ type: 'ADD_TRACKS', tracks });

      // Re-read tags to restore cover art (blob → File for jsmediatags)
      tracks.forEach((track, i) => {
        const blob = blobMap.get(track.id);
        if (!blob) return;
        const file = new File([blob], track.name, { type: track.type });
        readTags(file).then(meta => {
          if (meta.coverUrl) dispatch({ type: 'UPDATE_TRACK', id: track.id, patch: { coverUrl: meta.coverUrl } });
        });
      });
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentTrack = useMemo(
    () => state.tracks.find(t => t.id === state.queue[state.queuePos]) ?? null,
    [state.tracks, state.queue, state.queuePos]
  );

  // ── Load / resume audio when queue position or playing changes ────────────
  useEffect(() => {
    if (!audioEl) return;
    const id = state.queue[state.queuePos] ?? null;
    const track = id ? state.tracks.find(t => t.id === id) ?? null : null;
    if (!track) { audioEl.pause(); return; }
    if (audioEl.src !== track.url) {
      audioEl.src = track.url;
      audioEl.load();
    }
    if (state.playing) {
      audioCtx?.resume();
      audioEl.play().catch(() => {});
    } else {
      audioEl.pause();
    }
  }, [state.queuePos, state.playing, state.queue, state.tracks]);

  // ── Volume + mute ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gainNode) return;
    gainNode.gain.value = state.muted ? 0 : state.volume;
  }, [state.volume, state.muted]);

  // ── Speed (preservesPitch keeps pitch constant in modern browsers) ────────
  useEffect(() => {
    if (!audioEl) return;
    audioEl.playbackRate = state.speed;
    (audioEl as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
  }, [state.speed]);

  // Events are attached once inside attachAudioEvents(), called when audio is
  // first created — avoids the mount-time null problem.

  // ── A-B loop check via RAF (reads ref, never dispatches) ─────────────────
  useEffect(() => {
    let rafId: number;
    function check() {
      const { loopActive, loopA, loopB } = stateRef.current;
      if (audioEl && loopActive && loopA !== null && loopB !== null) {
        if (audioEl.currentTime >= loopB || audioEl.currentTime < loopA - 0.1) {
          audioEl.currentTime = loopA;
        }
      }
      rafId = requestAnimationFrame(check);
    }
    rafId = requestAnimationFrame(check);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Reset ReplayGain to unity on track change; readTags callback will re-apply if available
  useEffect(() => {
    setReplayGain(null);
  }, [state.queuePos]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const loadFiles = useCallback(async (files: FileList | File[]) => {
    const wasNull = !audioEl;
    ensureAudio();
    if (wasNull) attachAudioEvents(dispatch, getState);
    if (audioCtx?.state === 'suspended') audioCtx.resume();
    const existingIds = new Set(stateRef.current.tracks.map(t => t.id));
    const arr = Array.from(files).filter(
      f => (f.type.startsWith('audio/') || f.type.startsWith('video/'))
        && !existingIds.has(`${f.name}-${f.size}`)
    );
    if (arr.length === 0) return;

    // Pre-populate from Dexie for files we've seen before
    const storedMap = new Map<string, { title: string; artist: string; album: string; duration: number }>();
    await Promise.all(arr.map(async f => {
      const fileId = `${f.name}-${f.size}`;
      const stored = await db.tracks.where('fileId').equals(fileId).first();
      if (stored) storedMap.set(fileId, { title: stored.title, artist: stored.artist ?? '', album: stored.album ?? '', duration: stored.duration });
    }));

    const tracks: Track[] = arr.map(f => {
      const fileId = `${f.name}-${f.size}`;
      const cached = storedMap.get(fileId);
      return {
        id: fileId,
        name: f.name,
        title: cached?.title ?? f.name.replace(/\.[^/.]+$/, ''),
        artist: cached?.artist ?? '',
        album: cached?.album ?? '',
        size: f.size,
        type: f.type,
        url: URL.createObjectURL(f),
        coverUrl: '',
        duration: cached?.duration ?? 0,
      };
    });
    dispatch({ type: 'ADD_TRACKS', tracks });

    tracks.forEach((track, i) => {
      readTags(arr[i]).then(meta => {
        const patch: Partial<Track> = {};
        if (meta.title) patch.title = meta.title;
        if (meta.artist) patch.artist = meta.artist;
        if (meta.album) patch.album = meta.album;
        if (meta.coverUrl) patch.coverUrl = meta.coverUrl;
        if (Object.keys(patch).length > 0) dispatch({ type: 'UPDATE_TRACK', id: track.id, patch });

        // Apply ReplayGain if this is the currently playing track
        if (meta.replayGain !== undefined) {
          const cur = stateRef.current;
          if (cur.queue[cur.queuePos] === track.id) {
            setReplayGain(meta.replayGain ?? null);
          }
        }

        // Upsert metadata to Dexie (no blob URLs — session-scoped)
        const storedEntry = {
          fileId: track.id,
          name: track.name,
          title: patch.title ?? track.title,
          artist: patch.artist ?? track.artist,
          album: patch.album ?? track.album,
          size: track.size,
          type: track.type,
          duration: track.duration,
        };
        db.tracks.where('fileId').equals(track.id)
          .modify(storedEntry)
          .then(count => { if (count === 0) db.tracks.add(storedEntry).catch(() => {}); })
          .catch(() => {});
      });
    });

    // Store file blobs for session restore — respect 150 MB cap
    (async () => {
      const existingBlobs = await db.fileBlobs.toArray();
      const existingBlobIds = new Set(existingBlobs.map(b => b.fileId));
      const storedBytes = existingBlobs.reduce((sum, b) => sum + b.blob.size, 0);
      let budget = BLOB_STORAGE_LIMIT - storedBytes;
      let limitHit = false;

      for (const f of arr) {
        const fileId = `${f.name}-${f.size}`;
        if (existingBlobIds.has(fileId)) continue;
        if (f.size > budget) { limitHit = true; continue; }
        budget -= f.size;
        db.fileBlobs.put({ fileId, blob: f }).catch(() => {});
      }

      if (limitHit) {
        toast.error('Storage limit (150 MB) reached — some files won\'t persist between sessions');
      }
    })();
  }, []);

  const removeTrack = useCallback((id: string) => {
    const track = stateRef.current.tracks.find(t => t.id === id);
    const currentId = stateRef.current.queue[stateRef.current.queuePos] ?? null;

    // Stop audio if this was the playing track
    if (currentId === id && audioEl) {
      audioEl.pause();
      audioEl.src = '';
    }

    // Revoke blob URLs to free memory
    if (track) {
      if (track.url.startsWith('blob:'))      URL.revokeObjectURL(track.url);
      if (track.coverUrl?.startsWith('blob:')) URL.revokeObjectURL(track.coverUrl);
    }

    dispatch({ type: 'REMOVE_TRACK', id });

    // Remove from IndexedDB
    db.tracks.where('fileId').equals(id).delete().catch(() => {});
    db.fileBlobs.where('fileId').equals(id).delete().catch(() => {});
  }, []);

  const playNow = useCallback((id: string) => {
    const wasNull = !audioEl;
    ensureAudio();
    if (wasNull) attachAudioEvents(dispatch, getState);
    if (audioCtx?.state === 'suspended') audioCtx.resume();
    dispatch({ type: 'PLAY_NOW', id });
  }, []);

  const playNext       = useCallback((id: string) => dispatch({ type: 'PLAY_NEXT', id }), []);
  const addToQueue     = useCallback((id: string) => dispatch({ type: 'ADD_TO_QUEUE', id }), []);
  const removeFromQueue = useCallback((pos: number) => dispatch({ type: 'REMOVE_FROM_QUEUE', pos }), []);
  const clearQueue     = useCallback(() => dispatch({ type: 'CLEAR_QUEUE' }), []);
  const reorderQueue   = useCallback((from: number, to: number) => dispatch({ type: 'REORDER_QUEUE', from, to }), []);

  const togglePlay = useCallback(() => {
    const wasNull = !audioEl;
    ensureAudio();
    if (wasNull) attachAudioEvents(dispatch, getState);
    if (!audioEl) return;
    const playing = stateRef.current.playing;
    if (playing) {
      audioEl.pause();
      dispatch({ type: 'SET_PLAYING', playing: false });
    } else {
      audioCtx?.resume();
      audioEl.play().catch(() => {});
      dispatch({ type: 'SET_PLAYING', playing: true });
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    if (audioEl) audioEl.currentTime = Math.max(0, seconds);
  }, []);

  const next = useCallback(() => dispatch({ type: 'NEXT_TRACK' }), []);

  const prev = useCallback(() => {
    dispatch({ type: 'PREV_TRACK' });
  }, []);

  const setVolume     = useCallback((v: number) => dispatch({ type: 'SET_VOLUME', volume: v }), []);
  const toggleMute    = useCallback(() => dispatch({ type: 'TOGGLE_MUTE' }), []);
  const setSpeed      = useCallback((s: number) => dispatch({ type: 'SET_SPEED', speed: s }), []);
  const setLoopA      = useCallback(() => { if (audioEl) dispatch({ type: 'SET_LOOP_A', a: audioEl.currentTime }); }, []);
  const setLoopB      = useCallback(() => { if (audioEl) dispatch({ type: 'SET_LOOP_B', b: audioEl.currentTime }); }, []);
  const setLoopAAt    = useCallback((s: number) => dispatch({ type: 'SET_LOOP_A', a: s }), []);
  const setLoopBAt    = useCallback((s: number) => dispatch({ type: 'SET_LOOP_B', b: s }), []);
  const toggleLoop    = useCallback(() => dispatch({ type: 'TOGGLE_LOOP' }), []);
  const clearLoop     = useCallback(() => dispatch({ type: 'CLEAR_LOOP' }), []);
  const cycleShuffle  = useCallback(() => dispatch({ type: 'CYCLE_SHUFFLE' }), []);
  const cycleLoopMode = useCallback(() => dispatch({ type: 'CYCLE_LOOP_MODE' }), []);
  const setEQBandGainCb = useCallback((index: number, gainDb: number) => dspSetEQBandGain(index, gainDb), []);
  const setEQBypassCb   = useCallback((on: boolean) => dspSetEQBypass(on), []);

  // ── Media Session API ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.mediaSession) return;
    if (!currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title:  currentTrack.title  || currentTrack.name,
      artist: currentTrack.artist || '',
      album:  currentTrack.album  || '',
      artwork: currentTrack.coverUrl
        ? [{ src: currentTrack.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    });

    navigator.mediaSession.playbackState = state.playing ? 'playing' : 'paused';

    navigator.mediaSession.setActionHandler('play',          () => togglePlay());
    navigator.mediaSession.setActionHandler('pause',         () => togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => prev());
    navigator.mediaSession.setActionHandler('nexttrack',     () => next());
    navigator.mediaSession.setActionHandler('seekto',        (e) => seek((e as MediaSessionActionDetails).seekTime ?? 0));
  }, [currentTrack, state.playing, togglePlay, next, prev, seek]);

  return (
    <PlayerContext.Provider value={{
      state,
      analyserNode: _analyserNode,
      loadFiles,
      removeTrack,
      playNow, playNext, addToQueue, removeFromQueue, clearQueue, reorderQueue,
      togglePlay, seek, next, prev,
      setVolume, toggleMute, setSpeed,
      setLoopA, setLoopB, setLoopAAt, setLoopBAt, toggleLoop, clearLoop,
      cycleShuffle, cycleLoopMode,
      setEQBandGain: setEQBandGainCb, setEQBypass: setEQBypassCb,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be inside PlayerProvider');
  return ctx;
}

// Expose audio element for direct currentTime reads (e.g., RAF-driven progress bar)
export function getAudioEl(): HTMLAudioElement | null { return audioEl; }

// Helper — format seconds as M:SS
export function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
