'use client';

import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import jsmediatags from 'jsmediatags';

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
  musicalKey: number;
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
  musicalKey: 8,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'ADD_TRACKS'; tracks: Track[] }
  | { type: 'UPDATE_TRACK'; id: string; patch: Partial<Track> }
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
  | { type: 'SET_KEY'; key: number }
  | { type: 'TRACK_ENDED' };

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

    case 'PLAY_NOW':
      return { ...state, queue: [action.id], queuePos: 0, playing: true, position: 0 };

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
      const next = state.queuePos + 1;
      if (next < state.queue.length) return { ...state, queuePos: next, playing: true, position: 0 };
      if (state.loopMode === 'queue') return { ...state, queuePos: 0, playing: true, position: 0 };
      return { ...state, playing: false };
    }

    case 'PREV_TRACK': {
      if (state.queuePos > 0) return { ...state, queuePos: state.queuePos - 1, playing: true, position: 0 };
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

    case 'SET_KEY':
      return { ...state, musicalKey: action.key };

    case 'TRACK_ENDED': {
      const { loopMode, queuePos, queue } = state;
      if (loopMode === 'track') return { ...state, playing: true, position: 0 };
      const next = queuePos + 1;
      if (next < queue.length) return { ...state, queuePos: next, playing: true, position: 0 };
      if (loopMode === 'queue') return { ...state, queuePos: 0, playing: true, position: 0 };
      return { ...state, playing: false };
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

function ensureAudio() {
  if (audioEl) return;
  audioEl = new Audio();
  audioCtx = new AudioContext();
  _analyserNode = audioCtx.createAnalyser();
  _analyserNode.fftSize = 2048;
  gainNode = audioCtx.createGain();
  const src = audioCtx.createMediaElementSource(audioEl);
  src.connect(_analyserNode);
  _analyserNode.connect(gainNode);
  gainNode.connect(audioCtx.destination);
}

// Attach DOM events once, right after audioEl is created.
// Must receive dispatch since this runs outside React.
function attachAudioEvents(dispatch: React.Dispatch<Action>) {
  if (!audioEl) return;
  const audio = audioEl;
  const onTime = () =>
    dispatch({ type: 'TICK', position: audio.currentTime, duration: audio.duration || 0 });
  const onEnded = () => dispatch({ type: 'TRACK_ENDED' });
  audio.addEventListener('timeupdate', onTime);
  audio.addEventListener('loadedmetadata', onTime);
  audio.addEventListener('ended', onEnded);
}

// ─── ID3 metadata extraction ──────────────────────────────────────────────────

function readTags(file: File): Promise<{ title?: string; artist?: string; album?: string; coverUrl?: string }> {
  return new Promise(resolve => {
    jsmediatags.read(file, {
      onSuccess: tag => {
        const { title, artist, album, picture } = tag.tags;
        let coverUrl = '';
        if (picture) {
          const bytes = new Uint8Array(picture.data);
          const blob = new Blob([bytes], { type: picture.format });
          coverUrl = URL.createObjectURL(blob);
        }
        resolve({ title: title || '', artist: artist || '', album: album || '', coverUrl });
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
  setKey: (k: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

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

  // ── Actions ───────────────────────────────────────────────────────────────

  const loadFiles = useCallback((files: FileList | File[]) => {
    const wasNull = !audioEl;
    ensureAudio();
    if (wasNull) attachAudioEvents(dispatch);
    if (audioCtx?.state === 'suspended') audioCtx.resume();
    const arr = Array.from(files).filter(
      f => f.type.startsWith('audio/') || f.type.startsWith('video/')
    );
    if (arr.length === 0) return;

    const tracks: Track[] = arr.map(f => ({
      id: `${f.name}-${f.size}`,
      name: f.name,
      title: f.name.replace(/\.[^/.]+$/, ''),
      artist: '',
      album: '',
      size: f.size,
      type: f.type,
      url: URL.createObjectURL(f),
      coverUrl: '',
      duration: 0,
    }));
    dispatch({ type: 'ADD_TRACKS', tracks });

    tracks.forEach((track, i) => {
      readTags(arr[i]).then(meta => {
        const patch: Partial<Track> = {};
        if (meta.title) patch.title = meta.title;
        if (meta.artist) patch.artist = meta.artist;
        if (meta.album) patch.album = meta.album;
        if (meta.coverUrl) patch.coverUrl = meta.coverUrl;
        if (Object.keys(patch).length > 0) dispatch({ type: 'UPDATE_TRACK', id: track.id, patch });
      });
    });
  }, []);

  const playNow = useCallback((id: string) => {
    const wasNull = !audioEl;
    ensureAudio();
    if (wasNull) attachAudioEvents(dispatch);
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
    if (wasNull) attachAudioEvents(dispatch);
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
    const { queuePos } = stateRef.current;
    if (queuePos > 0) {
      dispatch({ type: 'PREV_TRACK' });
    } else if (audioEl) {
      audioEl.currentTime = 0;
    }
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
  const setKey        = useCallback((k: number) => dispatch({ type: 'SET_KEY', key: k }), []);

  return (
    <PlayerContext.Provider value={{
      state,
      analyserNode: _analyserNode,
      loadFiles,
      playNow, playNext, addToQueue, removeFromQueue, clearQueue, reorderQueue,
      togglePlay, seek, next, prev,
      setVolume, toggleMute, setSpeed,
      setLoopA, setLoopB, setLoopAAt, setLoopBAt, toggleLoop, clearLoop,
      cycleShuffle, cycleLoopMode, setKey,
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
