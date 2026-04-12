'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import { PlayerProvider, usePlayer } from '../../lib/playerContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { FileDropZone } from './FileDropZone';
import { TrackLibrary, type TrackLibraryHandle } from './TrackLibrary';
import { PlayerBar } from './PlayerBar';
import { QueueSidebar } from './QueueSidebar';
import { NowPlayingPanel } from './NowPlayingPanel';
import { KeyboardShortcutsOverlay } from './KeyboardShortcutsOverlay';
import { EQPanel } from '../eq/EQPanel';
import { NowPlayingStage } from './NowPlayingStage';

function PlayerInner() {
  const { state, setEQBandGain, setEQBypass } = usePlayer();
  const [libOpen, setLibOpen] = useState(true);
  const [queueOpen, setQueueOpen] = useState(false);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [eqOpen, setEqOpen] = useState(false);
  const searchRef = useRef<TrackLibraryHandle>(null);

  const handleToggleLib       = useCallback(() => setLibOpen(o => !o), []);
  const handleToggleQueue     = useCallback(() => setQueueOpen(o => !o), []);
  const handleOpenNowPlaying  = useCallback(() => setNowPlayingOpen(true), []);
  const handleCloseNowPlaying = useCallback(() => setNowPlayingOpen(false), []);
  const handleOpenShortcuts   = useCallback(() => setShortcutsOpen(true), []);
  const handleCloseShortcuts  = useCallback(() => setShortcutsOpen(false), []);
  const handleToggleEQ        = useCallback(() => setEqOpen(o => !o), []);
  const handleCloseEQ         = useCallback(() => setEqOpen(false), []);
  const handleCloseQueue      = useCallback(() => setQueueOpen(false), []);
  const handleFocusSearch     = useCallback(() => searchRef.current?.focusSearch(), []);

  useKeyboardShortcuts({
    onOpenShortcuts: handleOpenShortcuts,
    focusSearch: handleFocusSearch,
    onToggleEQ: handleToggleEQ,
  });

  const showLib = libOpen || state.tracks.length === 0;
  const currentId = state.queue[state.queuePos] ?? null;
  const currentTrack = useMemo(
    () => (currentId ? state.tracks.find(t => t.id === currentId) ?? null : null),
    [currentId, state.tracks]
  );

  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex flex-col"
      style={{ background: 'var(--bg)' }}
    >
      {/* ── Main area ── */}
      <div className="flex-1 relative min-h-0">

        {/* Now Playing Stage (center fill, behind panels) */}
        <NowPlayingStage libOpen={showLib} queueOpen={queueOpen} />

        {/* Library sidebar
            Mobile: full-screen overlay
            Desktop: 240px fixed left panel */}
        {showLib && (
          <div
            className="absolute left-0 top-0 bottom-0 z-20 flex flex-col select-none w-full sm:w-60"
            style={{ background: 'var(--s1)', borderRight: '1px solid var(--br)' }}
          >
            {/* Sidebar header */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
              <span style={{ color: 'var(--t1)', fontSize: 14, fontWeight: 800 }}>Library</span>
            </div>
            <FileDropZone />
            <TrackLibrary ref={searchRef} />
          </div>
        )}

        {/* Queue sidebar */}
        {queueOpen && <QueueSidebar onClose={handleCloseQueue} />}

        {/* Now Playing panel */}
        {nowPlayingOpen && currentTrack && (
          <NowPlayingPanel track={currentTrack} onClose={handleCloseNowPlaying} />
        )}

        {/* Keyboard shortcuts overlay */}
        {shortcutsOpen && (
          <KeyboardShortcutsOverlay onClose={handleCloseShortcuts} />
        )}
      </div>

      {/* ── Bottom stack: EQ drawer (mobile) + PlayerBar ── */}
      <div className="shrink-0 flex flex-col">
        {/* EQ drawer — mobile only */}
        <div
          className="sm:hidden overflow-hidden transition-all duration-200 ease-in-out"
          style={{
            background: 'var(--s1)',
            borderTop: eqOpen ? '1px solid var(--br)' : 'none',
            height: eqOpen ? 210 : 0,
            opacity: eqOpen ? 1 : 0,
            pointerEvents: eqOpen ? 'auto' : 'none',
          }}
        >
          <div style={{ height: 210 }}>
            <EQPanel
              open={eqOpen}
              onClose={handleCloseEQ}
              setEQBandGain={setEQBandGain}
              setEQBypass={setEQBypass}
            />
          </div>
        </div>

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
