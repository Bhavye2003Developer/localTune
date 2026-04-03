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
  id: string;          // `${name}-${size}`
  name: string;        // original filename
  title: string;       // display name (parsed from tags or filename)
  artist: string;      // from ID3 tags or empty string
  album: string;       // from ID3 tags or empty string
  size: number;
  type: string;
  url: string;         // objectURL — revoked when track is removed
  coverUrl: string;    // objectURL for cover art, '' if none
  duration: number;    // populated from loadedmetadata
}

// ─── Shuffle / loop modes ─────────────────────────────────────────────────────

export type ShuffleMode = 'off' | 'random';
export type LoopMode = 'off' | 'track' | 'queue';

// ─── State & actions ──────────────────────────────────────────────────────────

interface PlayerState {
  tracks: Track[];
  currentIdx: number;
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

const INITIAL: PlayerState = {
  tracks: [],
  currentIdx: -1,
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

type Action =
  | { type: 'ADD_TRACKS'; tracks: Track[] }
  | { type: 'UPDATE_TRACK'; id: string; patch: Partial<Track> }
  | { type: 'PLAY_IDX'; idx: number }
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function reducer(state: PlayerState, action: Action): PlayerState {
  switch (action.type) {
    case 'ADD_TRACKS': {
      const wasEmpty = state.currentIdx === -1;
      return {
        ...state,
        tracks: [...state.tracks, ...action.tracks],
        currentIdx: wasEmpty ? 0 : state.currentIdx,
      };
    }
    case 'UPDATE_TRACK':
      return {
        ...state,
        tracks: state.tracks.map(t =>
          t.id === action.id ? { ...t, ...action.patch } : t
        ),
      };
    case 'PLAY_IDX':
      return { ...state, currentIdx: action.idx, playing: true, position: 0 };
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
    case 'CYCLE_SHUFFLE':
      return {
        ...state,
        shuffleMode: state.shuffleMode === 'off' ? 'random' : 'off',
        // Reshuffle track order when enabling shuffle
        tracks: state.shuffleMode === 'off'
          ? shuffle(state.tracks)
          : state.tracks,
        currentIdx: state.shuffleMode === 'off' ? 0 : state.currentIdx,
      };
    case 'CYCLE_LOOP_MODE': {
      const modes: LoopMode[] = ['off', 'track', 'queue'];
      const next = modes[(modes.indexOf(state.loopMode) + 1) % modes.length];
      return { ...state, loopMode: next };
    }
    case 'SET_KEY':
      return { ...state, musicalKey: action.key };
    case 'TRACK_ENDED': {
      const { loopMode, currentIdx, tracks } = state;
      if (loopMode === 'track') return { ...state, playing: true, position: 0 };
      const next = currentIdx + 1;
      if (next < tracks.length) return { ...state, currentIdx: next, playing: true, position: 0 };
      if (loopMode === 'queue') return { ...state, currentIdx: 0, playing: true, position: 0 };
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
  playTrack: (idx: number) => void;
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

  // ── Load / resume audio when currentIdx or playing changes ───────────────
  useEffect(() => {
    if (!audioEl || state.currentIdx < 0 || state.currentIdx >= state.tracks.length) return;
    const track = state.tracks[state.currentIdx];
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
  }, [state.currentIdx, state.playing, state.tracks]);

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

    // Build tracks immediately with filename fallback, then update with tags async
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

    // Async: extract ID3 tags and update each track
    tracks.forEach((track, i) => {
      readTags(arr[i]).then(meta => {
        const patch: Partial<Track> = {};
        if (meta.title) patch.title = meta.title;
        if (meta.artist) patch.artist = meta.artist;
        if (meta.album) patch.album = meta.album;
        if (meta.coverUrl) patch.coverUrl = meta.coverUrl;
        if (Object.keys(patch).length > 0) {
          dispatch({ type: 'UPDATE_TRACK', id: track.id, patch });
        }
      });
    });
  }, []);

  const playTrack = useCallback((idx: number) => {
    const wasNull = !audioEl;
    ensureAudio();
    if (wasNull) attachAudioEvents(dispatch);
    if (audioCtx?.state === 'suspended') audioCtx.resume();
    dispatch({ type: 'PLAY_IDX', idx });
  }, []);

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

  const next = useCallback(() => {
    const { currentIdx, tracks } = stateRef.current;
    if (currentIdx < tracks.length - 1) dispatch({ type: 'PLAY_IDX', idx: currentIdx + 1 });
  }, []);

  const prev = useCallback(() => {
    const { currentIdx } = stateRef.current;
    if (currentIdx > 0) dispatch({ type: 'PLAY_IDX', idx: currentIdx - 1 });
    else if (audioEl) audioEl.currentTime = 0;
  }, []);

  const setVolume    = useCallback((v: number) => dispatch({ type: 'SET_VOLUME', volume: v }), []);
  const toggleMute   = useCallback(() => dispatch({ type: 'TOGGLE_MUTE' }), []);
  const setSpeed     = useCallback((s: number) => dispatch({ type: 'SET_SPEED', speed: s }), []);
  const setLoopA     = useCallback(() => {
    if (audioEl) dispatch({ type: 'SET_LOOP_A', a: audioEl.currentTime });
  }, []);
  const setLoopB     = useCallback(() => {
    if (audioEl) dispatch({ type: 'SET_LOOP_B', b: audioEl.currentTime });
  }, []);
  const setLoopAAt   = useCallback((s: number) => dispatch({ type: 'SET_LOOP_A', a: s }), []);
  const setLoopBAt   = useCallback((s: number) => dispatch({ type: 'SET_LOOP_B', b: s }), []);
  const toggleLoop   = useCallback(() => dispatch({ type: 'TOGGLE_LOOP' }), []);
  const clearLoop    = useCallback(() => dispatch({ type: 'CLEAR_LOOP' }), []);
  const cycleShuffle = useCallback(() => dispatch({ type: 'CYCLE_SHUFFLE' }), []);
  const cycleLoopMode = useCallback(() => dispatch({ type: 'CYCLE_LOOP_MODE' }), []);
  const setKey       = useCallback((k: number) => dispatch({ type: 'SET_KEY', key: k }), []);

  return (
    <PlayerContext.Provider value={{
      state,
      analyserNode: _analyserNode,
      loadFiles, playTrack, togglePlay, seek,
      next, prev, setVolume, toggleMute, setSpeed,
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
