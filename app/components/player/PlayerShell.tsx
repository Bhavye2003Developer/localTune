'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import { PlayerProvider, usePlayer } from '../../lib/playerContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { VisualizerContainer } from '../visualizer/VisualizerContainer';
import { FileDropZone } from './FileDropZone';
import { TrackLibrary, type TrackLibraryHandle } from './TrackLibrary';
import { PlayerBar } from './PlayerBar';
import { QueueSidebar } from './QueueSidebar';
import { NowPlayingPanel } from './NowPlayingPanel';
import { KeyboardShortcutsOverlay } from './KeyboardShortcutsOverlay';
import { EQPanel } from '../eq/EQPanel';

function PlayerInner() {
  const { state, analyserNode, setKey, setEQBandGain, setEQBypass } = usePlayer();
  const [libOpen, setLibOpen] = useState(true);
  const [queueOpen, setQueueOpen] = useState(false);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [eqOpen, setEqOpen] = useState(false);
  const searchRef = useRef<TrackLibraryHandle>(null);

  // Stable callbacks — don't recreate on every render
  const handleToggleLib      = useCallback(() => setLibOpen(o => !o), []);
  const handleToggleQueue    = useCallback(() => setQueueOpen(o => !o), []);
  const handleOpenNowPlaying = useCallback(() => setNowPlayingOpen(true), []);
  const handleCloseNowPlaying = useCallback(() => setNowPlayingOpen(false), []);
  const handleOpenShortcuts  = useCallback(() => setShortcutsOpen(true), []);
  const handleCloseShortcuts = useCallback(() => setShortcutsOpen(false), []);
  const handleToggleEQ       = useCallback(() => setEqOpen(o => !o), []);
  const handleCloseEQ        = useCallback(() => setEqOpen(false), []);
  const handleCloseQueue     = useCallback(() => setQueueOpen(false), []);
  const handleFocusSearch    = useCallback(() => searchRef.current?.focusSearch(), []);

  useKeyboardShortcuts({
    onOpenShortcuts: handleOpenShortcuts,
    focusSearch: handleFocusSearch,
    onToggleEQ: handleToggleEQ,
  });

  const showLib = libOpen || state.tracks.length === 0;
  const currentId = state.queue[state.queuePos] ?? null;

  // Avoid linear search on every render — only recompute when queue position or tracks change
  const currentTrack = useMemo(
    () => (currentId ? state.tracks.find(t => t.id === currentId) ?? null : null),
    [currentId, state.tracks]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* ── Full-screen visualizer ──────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <VisualizerContainer
          analyserNode={analyserNode}
          musicalKey={state.musicalKey}
          onKeyChange={setKey}
          vizMode={state.vizMode}
          coverUrl={currentTrack?.coverUrl ?? ''}
        />
      </div>

      {/* ── Library panel ───────────────────────────────────────────────────── */}
      {showLib && (
        <div className="absolute left-0 top-0 bottom-14 w-72 bg-black/80 backdrop-blur-xl border-r border-white/8 flex flex-col z-20 select-none">
          <div className="px-3 pt-3 pb-1 text-white/60 text-xs font-semibold tracking-wide">
            Library
          </div>
          <FileDropZone />
          <TrackLibrary ref={searchRef} />
        </div>
      )}

      {/* ── Queue sidebar ────────────────────────────────────────────────────── */}
      {queueOpen && <QueueSidebar onClose={handleCloseQueue} />}

      {/* ── Now Playing panel ───────────────────────────────────────────────── */}
      {nowPlayingOpen && currentTrack && (
        <NowPlayingPanel track={currentTrack} onClose={handleCloseNowPlaying} />
      )}

      {/* ── Keyboard shortcuts overlay ──────────────────────────────────────── */}
      {shortcutsOpen && (
        <KeyboardShortcutsOverlay onClose={handleCloseShortcuts} />
      )}

      {/* ── EQ drawer — slides up above PlayerBar ────────────────────────────── */}
      <div
        className={`absolute left-0 right-0 z-30 bg-black/85 backdrop-blur-xl border-t border-white/8 overflow-hidden transition-all duration-200 ease-in-out ${
          eqOpen ? 'h-[210px] opacity-100' : 'h-0 opacity-0 pointer-events-none'
        }`}
        style={{ bottom: '3.5rem' }}
      >
        <EQPanel
          open={eqOpen}
          onClose={handleCloseEQ}
          setEQBandGain={setEQBandGain}
          setEQBypass={setEQBypass}
        />
      </div>

      {/* ── Bottom player bar ────────────────────────────────────────────────── */}
      <PlayerBar
        libOpen={showLib}
        onToggleLib={handleToggleLib}
        queueOpen={queueOpen}
        onToggleQueue={handleToggleQueue}
        onOpenNowPlaying={handleOpenNowPlaying}
        onOpenShortcuts={handleOpenShortcuts}
        eqOpen={eqOpen}
        onToggleEQ={handleToggleEQ}
      />
    </div>
  );
}

export function PlayerShell() {
  return (
    <PlayerProvider>
      <PlayerInner />
    </PlayerProvider>
  );
}
