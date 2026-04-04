'use client';

import { useState, useRef } from 'react';
import { PlayerProvider, usePlayer } from '../../lib/playerContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { VisualizerContainer } from '../visualizer/VisualizerContainer';
import { FileDropZone } from './FileDropZone';
import { TrackLibrary, type TrackLibraryHandle } from './TrackLibrary';
import { PlayerBar } from './PlayerBar';
import { QueueSidebar } from './QueueSidebar';
import { NowPlayingPanel } from './NowPlayingPanel';
import { KeyboardShortcutsOverlay } from './KeyboardShortcutsOverlay';

function PlayerInner() {
  const { state, analyserNode, setKey } = usePlayer();
  const [libOpen, setLibOpen] = useState(true);
  const [queueOpen, setQueueOpen] = useState(false);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const searchRef = useRef<TrackLibraryHandle>(null);

  useKeyboardShortcuts({
    onOpenShortcuts: () => setShortcutsOpen(true),
    focusSearch: () => searchRef.current?.focusSearch(),
  });

  const showLib = libOpen || state.tracks.length === 0;
  const currentId = state.queue[state.queuePos] ?? null;
  const currentTrack = currentId ? state.tracks.find(t => t.id === currentId) ?? null : null;

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
      {queueOpen && <QueueSidebar onClose={() => setQueueOpen(false)} />}

      {/* ── Now Playing panel ───────────────────────────────────────────────── */}
      {nowPlayingOpen && currentTrack && (
        <NowPlayingPanel track={currentTrack} onClose={() => setNowPlayingOpen(false)} />
      )}

      {/* ── Keyboard shortcuts overlay ──────────────────────────────────────── */}
      {shortcutsOpen && (
        <KeyboardShortcutsOverlay onClose={() => setShortcutsOpen(false)} />
      )}

      {/* ── Bottom player bar ────────────────────────────────────────────────── */}
      <PlayerBar
        libOpen={showLib}
        onToggleLib={() => setLibOpen(o => !o)}
        queueOpen={queueOpen}
        onToggleQueue={() => setQueueOpen(o => !o)}
        onOpenNowPlaying={() => setNowPlayingOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
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
