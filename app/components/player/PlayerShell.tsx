'use client';

import { useState, useRef, useCallback } from 'react';
import { PlayerProvider, usePlayer, formatTime } from '../../lib/playerContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { FileDropZone } from './FileDropZone';
import { TrackLibrary, type TrackLibraryHandle } from './TrackLibrary';
import { PlayerBar } from './PlayerBar';
import { NowPlayingPanel } from './NowPlayingPanel';
import { KeyboardShortcutsOverlay } from './KeyboardShortcutsOverlay';
import { EQPanel } from '../eq/EQPanel';
import { DSPPanel } from '../dsp/DSPPanel';
import { NowPlayingStage } from './NowPlayingStage';
import { TabStrip, type TabId } from './TabStrip';
import { InlineQueue } from './InlineQueue';
import { MobileBottomNav, type MobileTab } from './MobileBottomNav';
import { MiniPlayerStrip } from './MiniPlayerStrip';

// ─── Marks (A-B loop) inline panel ───────────────────────────────────────────

function MarksPanel() {
  const { state, setLoopA, setLoopB, toggleLoop, clearLoop } = usePlayer();
  const { duration, loopA, loopB, loopActive } = state;

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={setLoopA}
          disabled={!duration}
          className="flex items-center justify-center h-9 px-3 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-20"
          style={{
            color: loopA !== null ? 'var(--a)' : 'var(--t2)',
            background: loopA !== null ? '#f59e0b18' : 'var(--s2)',
            border: loopA !== null ? '1px solid #f59e0b45' : '1px solid var(--br)',
          }}
        >
          A {loopA !== null ? formatTime(loopA) : '—'}
        </button>
        <button
          onClick={setLoopB}
          disabled={!duration}
          className="flex items-center justify-center h-9 px-3 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-20"
          style={{
            color: loopB !== null ? 'var(--a)' : 'var(--t2)',
            background: loopB !== null ? '#f59e0b18' : 'var(--s2)',
            border: loopB !== null ? '1px solid #f59e0b45' : '1px solid var(--br)',
          }}
        >
          B {loopB !== null ? formatTime(loopB) : '—'}
        </button>
        {loopA !== null && loopB !== null && (
          <button
            onClick={toggleLoop}
            className="flex items-center justify-center h-9 px-3 rounded-lg text-[10px] font-bold transition-colors"
            style={{
              color: loopActive ? 'var(--a)' : 'var(--t2)',
              background: loopActive ? '#f59e0b18' : 'var(--s2)',
              border: loopActive ? '1px solid #f59e0b45' : '1px solid var(--br)',
            }}
          >
            Loop {loopActive ? 'on' : 'off'}
          </button>
        )}
        {(loopA !== null || loopB !== null) && (
          <button
            onClick={clearLoop}
            className="flex items-center justify-center h-9 px-3 rounded-lg text-[10px] font-bold transition-colors"
            style={{ color: 'var(--t2)', background: 'var(--s2)', border: '1px solid var(--br)' }}
          >
            Clear
          </button>
        )}
      </div>
      <p style={{ color: 'var(--t3)', fontSize: 10, fontWeight: 500 }}>
        Set A/B markers using the A/B buttons in the player bar or right-click the seek bar.
      </p>
    </div>
  );
}

// ─── Smart Playlists placeholder ─────────────────────────────────────────────

function SmartPlaylistsPlaceholder() {
  return (
    <div
      className="shrink-0"
      style={{ borderTop: '1px solid var(--br)', padding: '8px 14px' }}
    >
      <p style={{ color: 'var(--t3)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Smart Playlists
      </p>
      <p className="mt-1" style={{ color: 'var(--t3)', fontSize: 10, fontWeight: 500 }}>
        Requires analysis — coming soon
      </p>
    </div>
  );
}

// ─── Panel stack — tab panels ─────────────────────────────────────────────────

interface PanelStackProps {
  openPanels: Set<TabId>;
  onToggleEQ: () => void;
  detectedReplayGain: string | null;
  setEQBandGain: (i: number, g: number) => void;
  setEQBypass:   (on: boolean) => void;
  currentTrack: { title: string } | null;
  onOpenNowPlaying: () => void;
}

function PanelStack({
  openPanels, onToggleEQ, detectedReplayGain,
  setEQBandGain, setEQBypass, currentTrack, onOpenNowPlaying,
}: PanelStackProps) {
  return (
    <div className="flex flex-col">
      {openPanels.has('EQ') && (
        <div style={{ height: 240, borderBottom: '1px solid var(--br)' }}>
          <EQPanel
            open={true}
            onClose={() => {}}
            setEQBandGain={setEQBandGain}
            setEQBypass={setEQBypass}
          />
        </div>
      )}
      {openPanels.has('DSP') && (
        <div style={{ height: 280, overflowY: 'auto', borderBottom: '1px solid var(--br)' }}>
          <DSPPanel onOpenEQ={onToggleEQ} detectedReplayGain={detectedReplayGain} />
        </div>
      )}
      {openPanels.has('Info') && (
        <div style={{ borderBottom: '1px solid var(--br)' }}>
          <div className="px-4 py-3">
            {currentTrack ? (
              <button
                onClick={onOpenNowPlaying}
                className="h-9 px-3 rounded-lg text-[10px] font-bold transition-colors"
                style={{ color: 'var(--a)', background: '#f59e0b18', border: '1px solid #f59e0b45' }}
              >
                Open full info panel →
              </button>
            ) : (
              <p style={{ color: 'var(--t3)', fontSize: 11 }}>No track loaded</p>
            )}
          </div>
        </div>
      )}
      {openPanels.has('Marks') && (
        <div style={{ borderBottom: '1px solid var(--br)' }}>
          <MarksPanel />
        </div>
      )}
    </div>
  );
}

// ─── Inner shell ─────────────────────────────────────────────────────────────

function PlayerInner() {
  const { state, setEQBandGain, setEQBypass } = usePlayer();
  const [openPanels, setOpenPanels] = useState<Set<TabId>>(new Set());
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [detectedReplayGain] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('library');
  const searchRef = useRef<TrackLibraryHandle>(null);

  const handleTogglePanel = useCallback((tab: TabId) => {
    setOpenPanels(prev => {
      const next = new Set(prev);
      if (next.has(tab)) next.delete(tab); else next.add(tab);
      return next;
    });
  }, []);

  const handleToggleEQ  = useCallback(() => handleTogglePanel('EQ'),  [handleTogglePanel]);
  const handleToggleDSP = useCallback(() => handleTogglePanel('DSP'), [handleTogglePanel]);

  const handleOpenNowPlaying  = useCallback(() => setNowPlayingOpen(true),  []);
  const handleCloseNowPlaying = useCallback(() => setNowPlayingOpen(false), []);
  const handleOpenShortcuts   = useCallback(() => setShortcutsOpen(true),   []);
  const handleCloseShortcuts  = useCallback(() => setShortcutsOpen(false),  []);
  const handleFocusSearch     = useCallback(() => searchRef.current?.focusSearch(), []);

  useKeyboardShortcuts({
    onOpenShortcuts: handleOpenShortcuts,
    focusSearch: handleFocusSearch,
    onToggleEQ: handleToggleEQ,
    onToggleDSP: handleToggleDSP,
  });

  const currentId    = state.queue[state.queuePos] ?? null;
  const currentTrack = currentId ? state.tracks.find(t => t.id === currentId) ?? null : null;

  const panelStackProps: PanelStackProps = {
    openPanels,
    onToggleEQ: handleToggleEQ,
    detectedReplayGain,
    setEQBandGain,
    setEQBypass,
    currentTrack,
    onOpenNowPlaying: handleOpenNowPlaying,
  };

  return (
    <div
      className="relative w-screen overflow-hidden flex flex-col"
      style={{ height: '100dvh', background: 'var(--bg)' }}
    >

      {/* ══════════════════════════════════════════
          DESKTOP  ≥ sm
          ══════════════════════════════════════════ */}
      <div className="hidden sm:flex flex-1 min-h-0">

        {/* Left sidebar 240px */}
        <div
          className="w-60 shrink-0 flex flex-col"
          style={{ background: 'var(--s1)', borderRight: '1px solid var(--br)' }}
        >
          <div
            className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0"
            style={{ borderBottom: '1px solid var(--br)' }}
          >
            <span style={{ color: 'var(--a)', fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em' }}>
              FineTune
            </span>
          </div>
          <div className="shrink-0"><FileDropZone /></div>
          <TrackLibrary ref={searchRef} />
          <SmartPlaylistsPlaceholder />
        </div>

        {/* Center column */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">

          {/* Now playing */}
          <div className="shrink-0" style={{ borderBottom: '1px solid var(--br)' }}>
            <NowPlayingStage />
          </div>

          {/* Tab strip */}
          <TabStrip openPanels={openPanels} onToggle={handleTogglePanel} />

          {/* Panel stack */}
          <div className="shrink-0 overflow-y-auto" style={{ maxHeight: 340 }}>
            <PanelStack {...panelStackProps} />
          </div>

          {/* Queue fills remaining height */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <InlineQueue />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MOBILE  < sm
          ══════════════════════════════════════════ */}
      <div className="sm:hidden flex-1 min-h-0 flex flex-col overflow-hidden">

        {mobileTab === 'library' ? (
          <div className="flex-1 min-h-0 flex flex-col" style={{ background: 'var(--s1)' }}>
            <div
              className="px-4 pt-4 pb-3 shrink-0"
              style={{ borderBottom: '1px solid var(--br)' }}
            >
              <span style={{ color: 'var(--a)', fontSize: 15, fontWeight: 800 }}>FineTune</span>
            </div>
            <div className="shrink-0"><FileDropZone /></div>
            <TrackLibrary ref={searchRef} />
          </div>
        ) : mobileTab === 'queue' ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
            <InlineQueue />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto" style={{ background: 'var(--bg)' }}>
            <NowPlayingStage />
            <TabStrip openPanels={openPanels} onToggle={handleTogglePanel} />
            <PanelStack {...panelStackProps} />
          </div>
        )}

        {/* Mini player — library + queue tabs */}
        {mobileTab !== 'player' && (
          <MiniPlayerStrip onOpenPlayer={() => setMobileTab('player')} />
        )}
      </div>

      {/* ══════════════════════════════════════════
          PLAYER BAR — desktop always, mobile player-tab only
          ══════════════════════════════════════════ */}

      <div className="hidden sm:block shrink-0">
        <PlayerBar
          onOpenNowPlaying={handleOpenNowPlaying}
          onOpenShortcuts={handleOpenShortcuts}
        />
      </div>

      <div className="sm:hidden shrink-0 flex flex-col">
        {mobileTab === 'player' && (
          <PlayerBar
            onOpenNowPlaying={handleOpenNowPlaying}
            onOpenShortcuts={handleOpenShortcuts}
          />
        )}
        <MobileBottomNav activeTab={mobileTab} onSwitch={setMobileTab} />
      </div>

      {/* ══════════════════════════════════════════
          OVERLAYS
          ══════════════════════════════════════════ */}

      {nowPlayingOpen && currentTrack && (
        <NowPlayingPanel track={currentTrack} onClose={handleCloseNowPlaying} />
      )}
      {shortcutsOpen && (
        <KeyboardShortcutsOverlay onClose={handleCloseShortcuts} />
      )}

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
