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
    <div className="relative w-screen h-screen overflow-hidden flex flex-col nx-dot-grid" style={{ background: 'var(--nx-bg-deep)' }}>
      {/* ── Main area (grows to fill space above bottom bar) ── */}
      <div className="flex-1 relative min-h-0">

        {/* ── Now Playing Stage (center fill) ── */}
        <NowPlayingStage libOpen={showLib} queueOpen={queueOpen} />

        {/* ── Library panel
             Mobile: full-screen overlay over the visualizer
             Desktop sm+: left panel 288px wide                                  ── */}
        {showLib && (
          <div className="
            absolute left-0 top-0 bottom-0 z-20
            flex flex-col select-none nx-scanline-overlay
            border-r w-full sm:w-72
          " style={{ background: 'var(--nx-bg-panel)', borderColor: 'var(--nx-border)' }}>
            <div className="px-3 pt-3 pb-1 flex items-center justify-between">
              <span className="font-mono uppercase tracking-widest text-[9px]" style={{ color: 'var(--nx-cyan-dim)' }}>
                ◈ INTEL DATABASE
              </span>
            </div>
            <FileDropZone />
            <TrackLibrary ref={searchRef} />
          </div>
        )}

        {/* ── Queue sidebar
             Mobile: full-screen overlay
             Desktop: right panel 288px                                           ── */}
        {queueOpen && <QueueSidebar onClose={handleCloseQueue} />}

        {/* ── Now Playing panel ── */}
        {nowPlayingOpen && currentTrack && (
          <NowPlayingPanel track={currentTrack} onClose={handleCloseNowPlaying} />
        )}

        {/* ── Keyboard shortcuts overlay ── */}
        {shortcutsOpen && (
          <KeyboardShortcutsOverlay onClose={handleCloseShortcuts} />
        )}
      </div>

      {/* ── Bottom stack: EQ drawer + PlayerBar ────────────────────────────── */}
      <div className="shrink-0 flex flex-col">
        {/* EQ drawer — slides open above PlayerBar with CSS transition */}
        <div
          className={`
            bg-black/85 backdrop-blur-xl border-t border-white/8
            overflow-hidden transition-all duration-200 ease-in-out
            ${eqOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          `}
          style={{ height: eqOpen ? undefined : 0, maxHeight: eqOpen ? 210 : 0 }}
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

        {/* PlayerBar */}
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
