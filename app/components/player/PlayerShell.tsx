'use client';

import { useState } from 'react';
import { PlayerProvider, usePlayer } from '../../lib/playerContext';
import { VisualizerContainer } from '../visualizer/VisualizerContainer';
import { FileDropZone } from './FileDropZone';
import { TrackLibrary } from './TrackLibrary';
import { PlayerBar } from './PlayerBar';
import { QueueSidebar } from './QueueSidebar';

function PlayerInner() {
  const { state, analyserNode, setKey } = usePlayer();
  const [libOpen, setLibOpen] = useState(true); // open by default when empty
  const [queueOpen, setQueueOpen] = useState(false);

  // Auto-close library once tracks are playing and user hasn't pinned it
  const showLib = libOpen || state.tracks.length === 0;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* ── Full-screen visualizer (behind everything) ──────────────────── */}
      <div className="absolute inset-0">
        <VisualizerContainer
          analyserNode={analyserNode}
          musicalKey={state.musicalKey}
          onKeyChange={setKey}
        />
      </div>

      {/* ── Library panel (left side, collapsible) ──────────────────────── */}
      {showLib && (
        <div className="absolute left-0 top-0 bottom-14 w-72 bg-black/80 backdrop-blur-xl border-r border-white/8 flex flex-col z-20 select-none">
          <div className="px-3 pt-3 pb-1 text-white/60 text-xs font-semibold tracking-wide">
            Library
          </div>
          <FileDropZone />
          <TrackLibrary />
        </div>
      )}

      {/* ── Queue sidebar (right side, collapsible) ─────────────────────── */}
      {queueOpen && <QueueSidebar onClose={() => setQueueOpen(false)} />}

      {/* ── Bottom player bar ───────────────────────────────────────────── */}
      <PlayerBar
        libOpen={showLib}
        onToggleLib={() => setLibOpen(o => !o)}
        queueOpen={queueOpen}
        onToggleQueue={() => setQueueOpen(o => !o)}
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
