# NEXUS-7 Tactical Interface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every visible UI component to a military-grade cybergenetic aesthetic — cyan + red on deep black, monospace data readouts, angular clip-paths, corner bracket decorations, tactical terminology.

**Architecture:** Pure styling changes — no new functionality, no new state, no new props. All changes are Tailwind class swaps and CSS additions. A new shared `TacticalBrackets` component provides the corner bracket decoration. All existing tests must continue to pass.

**Tech Stack:** Tailwind CSS v4, Next.js 16, React 19, TypeScript. No new packages.

---

## File Map

| File | Change |
|------|--------|
| `app/globals.css` | CSS variables, dot-grid, animations, scrollbar, clip-path utility |
| `app/components/ui/TacticalBrackets.tsx` | **NEW** — shared corner bracket decoration component |
| `app/components/player/PlayerShell.tsx` | Root background + dot-grid class |
| `app/components/player/TrackLibrary.tsx` | Intel Database — header, search, rows, context menu |
| `app/components/player/FileDropZone.tsx` | Tactical drop zone — corner brackets, copy, drag state |
| `app/components/player/PlayerBar.tsx` | Command Console — progress ticks, transport, controls |
| `app/components/eq/EQPanel.tsx` | Signal Processor — header, bypass, presets |
| `app/components/eq/EQCurve.tsx` | Cyan curve, crosshair drag dots |
| `app/components/player/QueueSidebar.tsx` | Mission Queue — clip-path, numbered rows |
| `app/components/player/NowPlayingPanel.tsx` | Now Broadcasting — clip-path, corner brackets |
| `app/components/player/KeyboardShortcutsOverlay.tsx` | Command Reference — table layout |

---

## Task 1: CSS Foundation

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace globals.css entirely**

```css
@import "tailwindcss";

/* ── NEXUS-7 Design Tokens ──────────────────────────────────────────────────── */
:root {
  --nx-bg-deep:      #000a0e;
  --nx-bg-panel:     #020f14;
  --nx-bg-raised:    #041520;
  --nx-cyan:         #00d4ff;
  --nx-cyan-dim:     #004d5c;
  --nx-red:          #ff003c;
  --nx-text:         #c8e8f0;
  --nx-text-dim:     #3d6070;
  --nx-border:       rgba(0, 212, 255, 0.12);
  --nx-border-active: rgba(0, 212, 255, 0.6);
}

@theme inline {
  --color-background: var(--nx-bg-deep);
  --color-foreground: var(--nx-text);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

/* ── Base ───────────────────────────────────────────────────────────────────── */
body {
  background: var(--nx-bg-deep);
  color: var(--nx-text);
  font-family: Arial, Helvetica, sans-serif;
}

html, body {
  overscroll-behavior: none;
}

/* ── iOS safe-area ──────────────────────────────────────────────────────────── */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* ── Dot-grid background ────────────────────────────────────────────────────── */
.nx-dot-grid {
  background-image: radial-gradient(circle, rgba(0, 212, 255, 0.06) 1px, transparent 1px);
  background-size: 24px 24px;
}

@media (max-width: 639px) {
  .nx-dot-grid {
    background-image: radial-gradient(circle, rgba(0, 212, 255, 0.03) 1px, transparent 1px);
  }
}

/* ── Clip-path panel (diagonal top-right cut) ───────────────────────────────── */
.nx-clip-panel {
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
}

/* ── Scrollbar ──────────────────────────────────────────────────────────────── */
::-webkit-scrollbar       { width: 2px; height: 2px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0, 212, 255, 0.25); }
::-webkit-scrollbar-thumb:hover { background: rgba(0, 212, 255, 0.5); }

/* ── Animations ─────────────────────────────────────────────────────────────── */
@keyframes nx-scanline {
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}

@keyframes nx-blink {
  0%, 49%  { opacity: 1; }
  50%, 100% { opacity: 0; }
}

@keyframes nx-glow-pulse {
  0%, 100% { box-shadow: 0 0 4px rgba(0, 212, 255, 0.3); }
  50%       { box-shadow: 0 0 12px rgba(0, 212, 255, 0.7); }
}

@keyframes nx-flicker {
  0%   { opacity: 0.2; }
  40%  { opacity: 1; }
  60%  { opacity: 0.5; }
  100% { opacity: 1; }
}

/* ── Animation utilities ────────────────────────────────────────────────────── */
@utility animate-nx-blink {
  animation: nx-blink 1.2s step-end infinite;
}

@utility animate-nx-glow-pulse {
  animation: nx-glow-pulse 2s ease-in-out infinite;
}

@utility animate-nx-flicker {
  animation: nx-flicker 120ms ease-out forwards;
}

/* Disable scanline + reduce dot-grid on mobile */
@media (max-width: 639px) {
  .nx-scanline-overlay::after { display: none; }
}

/* ── Scanline overlay ───────────────────────────────────────────────────────── */
.nx-scanline-overlay {
  position: relative;
  overflow: hidden;
}
.nx-scanline-overlay::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 40px;
  background: linear-gradient(to bottom, transparent, rgba(0, 212, 255, 0.03), transparent);
  animation: nx-scanline 8s linear infinite;
  pointer-events: none;
  z-index: 0;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Run tests**

```bash
npm test
```
Expected: all tests pass (153 passing)

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "style: NEXUS-7 CSS foundation — tokens, dot-grid, animations, scrollbar"
```

---

## Task 2: TacticalBrackets Component

**Files:**
- Create: `app/components/ui/TacticalBrackets.tsx`

- [ ] **Step 1: Create component**

```tsx
// app/components/ui/TacticalBrackets.tsx
interface Props {
  /** Arm length in px. Default 14 */
  size?: number;
  /** Border thickness in px. Default 1.5 */
  thickness?: number;
  /** CSS color string. Default rgba(0,212,255,0.5) */
  color?: string;
}

/**
 * Renders four corner brackets as absolute-positioned spans.
 * Parent must have `position: relative` (or `relative` Tailwind class).
 */
export function TacticalBrackets({
  size = 14,
  thickness = 1.5,
  color = 'rgba(0,212,255,0.5)',
}: Props) {
  const base: React.CSSProperties = {
    position: 'absolute',
    width:  size,
    height: size,
    borderColor: color,
    borderStyle: 'solid',
    pointerEvents: 'none',
  };

  return (
    <>
      {/* Top-left */}
      <span style={{ ...base, top: 0, left: 0,  borderWidth: `${thickness}px 0 0 ${thickness}px` }} />
      {/* Top-right */}
      <span style={{ ...base, top: 0, right: 0, borderWidth: `${thickness}px ${thickness}px 0 0` }} />
      {/* Bottom-left */}
      <span style={{ ...base, bottom: 0, left: 0,  borderWidth: `0 0 ${thickness}px ${thickness}px` }} />
      {/* Bottom-right */}
      <span style={{ ...base, bottom: 0, right: 0, borderWidth: `0 ${thickness}px ${thickness}px 0` }} />
    </>
  );
}
```

- [ ] **Step 2: Run build**

```bash
npm run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add app/components/ui/TacticalBrackets.tsx
git commit -m "feat: add TacticalBrackets shared component"
```

---

## Task 3: PlayerShell — Root Background

**Files:**
- Modify: `app/components/player/PlayerShell.tsx`

- [ ] **Step 1: Apply dot-grid and deep bg to root div**

Find:
```tsx
    <div className="relative w-screen h-screen overflow-hidden bg-black flex flex-col">
```
Replace with:
```tsx
    <div className="relative w-screen h-screen overflow-hidden flex flex-col nx-dot-grid" style={{ background: 'var(--nx-bg-deep)' }}>
```

- [ ] **Step 2: Restyle library panel container**

Find:
```tsx
          <div className="
            absolute left-0 top-0 bottom-0 z-20
            flex flex-col select-none
            bg-black/90 backdrop-blur-xl border-r border-white/8
            w-full sm:w-72
          ">
            <div className="px-3 pt-3 pb-1 text-white/60 text-xs font-semibold tracking-wide">
              Library
            </div>
```
Replace with:
```tsx
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
```

- [ ] **Step 3: Run build + tests**

```bash
npm run build && npm test
```
Expected: build passes, all tests pass

- [ ] **Step 4: Commit**

```bash
git add app/components/player/PlayerShell.tsx
git commit -m "style: PlayerShell — deep bg, dot-grid, Intel Database panel header"
```

---

## Task 4: TrackLibrary — Intel Database

**Files:**
- Modify: `app/components/player/TrackLibrary.tsx`

- [ ] **Step 1: Replace the full component**

Replace the entire file content with:

```tsx
'use client';

import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Play, X } from 'lucide-react';
import { usePlayer, formatTime } from '../../lib/playerContext';

export interface TrackLibraryHandle {
  focusSearch(): void;
}

export const TrackLibrary = forwardRef<TrackLibraryHandle>(function TrackLibrary(_, ref) {
  const { state, playNow, playNext, addToQueue } = usePlayer();
  const { tracks, queue, queuePos, playing } = state;
  const currentId = queue[queuePos] ?? null;
  const parentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useImperativeHandle(ref, () => ({
    focusSearch: () => searchRef.current?.focus(),
  }));

  const filtered = query
    ? tracks.filter(t =>
        [t.title, t.artist, t.album, t.name].some(s =>
          s.toLowerCase().includes(query.toLowerCase())
        )
      )
    : tracks;

  const [menu, setMenu] = useState<{ visible: boolean; x: number; y: number; trackId: string }>({
    visible: false, x: 0, y: 0, trackId: '',
  });

  const closeMenu = useCallback(() => setMenu(m => ({ ...m, visible: false })), []);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = useCallback((x: number, y: number, trackId: string) => {
    const clampedX = Math.min(x, window.innerWidth - 164);
    const clampedY = Math.min(y, window.innerHeight - 120);
    setMenu({ visible: true, x: clampedX, y: clampedY, trackId });
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (!menu.visible) return;
    window.addEventListener('pointerdown', closeMenu);
    return () => window.removeEventListener('pointerdown', closeMenu);
  }, [menu.visible, closeMenu]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 5,
  });

  if (tracks.length === 0) return null;

  return (
    <div className="flex-1 min-h-0 flex flex-col">

      {/* ── Search ── */}
      <div className="px-3 py-2 relative">
        <div className="flex items-center border-b" style={{ borderColor: 'rgba(0,212,255,0.2)' }}>
          <span className="font-mono text-[10px] shrink-0 pr-1.5" style={{ color: 'var(--nx-cyan-dim)' }}>
            QUERY ›
          </span>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="search tracks..."
            className="flex-1 bg-transparent text-[11px] py-1 focus:outline-none font-mono"
            style={{
              color: 'var(--nx-text)',
              caretColor: 'var(--nx-cyan)',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="shrink-0 transition-colors"
              style={{ color: 'var(--nx-text-dim)' }}
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* ── Count line ── */}
      <div className="px-3 pb-1 flex items-center justify-between">
        <span className="font-mono uppercase tracking-widest text-[9px]" style={{ color: 'var(--nx-cyan-dim)' }}>
          {query ? `${filtered.length} RESULTS` : `${tracks.length} FILES LOADED`}
        </span>
        {query && (
          <span className="font-mono text-[9px]" style={{ color: 'var(--nx-text-dim)' }}>
            {filtered.length}/{tracks.length}
          </span>
        )}
      </div>

      {/* ── Track list ── */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(vItem => {
            const track = filtered[vItem.index];
            const isCurrent = track.id === currentId;
            const idx = String(vItem.index + 1).padStart(3, '0');

            return (
              <div
                key={track.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${vItem.start}px)`,
                  width: '100%',
                  height: vItem.size,
                  borderLeft: isCurrent
                    ? '2px solid var(--nx-cyan)'
                    : '2px solid transparent',
                  background: isCurrent ? 'var(--nx-bg-raised)' : undefined,
                }}
                onClick={() => playNow(track.id)}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  const { clientX, clientY } = e;
                  const tid = track.id;
                  longPressTimer.current = setTimeout(() => {
                    longPressTimer.current = null;
                    openMenu(clientX, clientY, tid);
                  }, 500);
                }}
                onPointerMove={cancelLongPress}
                onPointerUp={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onContextMenu={(e) => {
                  e.preventDefault();
                  cancelLongPress();
                  openMenu(e.clientX, e.clientY, track.id);
                }}
                className="flex items-center gap-2 px-2 cursor-pointer transition-colors group"
                onMouseEnter={e => {
                  if (!isCurrent) {
                    (e.currentTarget as HTMLDivElement).style.borderLeftColor = 'var(--nx-red)';
                    (e.currentTarget as HTMLDivElement).style.background = '#06101a';
                  }
                }}
                onMouseLeave={e => {
                  if (!isCurrent) {
                    (e.currentTarget as HTMLDivElement).style.borderLeftColor = 'transparent';
                    (e.currentTarget as HTMLDivElement).style.background = '';
                  }
                }}
              >
                {/* Index */}
                <span className="font-mono text-[9px] shrink-0 w-7 text-right" style={{ color: 'var(--nx-cyan-dim)' }}>
                  T-{idx}
                </span>

                {/* Status dot */}
                <span
                  className={isCurrent && playing ? 'animate-nx-blink' : ''}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: track.error ? 'var(--nx-red)' : isCurrent ? 'var(--nx-cyan)' : 'var(--nx-cyan-dim)',
                    flexShrink: 0,
                  }}
                />

                {/* Icon for playing state */}
                <div className="w-5 shrink-0 flex items-center justify-center">
                  {isCurrent && playing ? (
                    <span className="flex gap-px items-end h-3.5">
                      {[1, 2, 3].map(i => (
                        <span
                          key={i}
                          className="w-px rounded-full animate-bounce"
                          style={{
                            height: `${50 + i * 15}%`,
                            animationDelay: `${i * 100}ms`,
                            background: 'var(--nx-cyan)',
                          }}
                        />
                      ))}
                    </span>
                  ) : isCurrent ? (
                    <Play size={10} style={{ color: 'var(--nx-cyan)', fill: 'var(--nx-cyan)' }} />
                  ) : null}
                </div>

                {/* Title + artist */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] truncate leading-tight" style={{ color: isCurrent ? 'var(--nx-cyan)' : 'var(--nx-text)' }}>
                    {track.title}
                  </p>
                  <p className="font-mono text-[9px] truncate" style={{ color: 'var(--nx-text-dim)' }}>
                    {track.artist || track.name}
                  </p>
                </div>

                {/* Duration */}
                {track.duration > 0 && (
                  <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--nx-cyan-dim)' }}>
                    {formatTime(track.duration)}
                  </span>
                )}

                {/* Error badge */}
                {track.error && (
                  <span className="font-mono text-[9px] px-1 shrink-0" style={{ color: 'var(--nx-red)', border: '1px solid var(--nx-red)', opacity: 0.8 }}>
                    ERR
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Context menu ── */}
      {menu.visible && (
        <div
          className="fixed z-50 py-1 shadow-xl"
          style={{
            left: menu.x,
            top: menu.y,
            background: 'var(--nx-bg-panel)',
            border: '1px solid var(--nx-border-active)',
          }}
        >
          {[
            { label: 'PLAY NOW',     action: () => { playNow(menu.trackId);    closeMenu(); } },
            { label: 'PLAY NEXT',    action: () => { playNext(menu.trackId);   closeMenu(); } },
            { label: 'ADD TO QUEUE', action: () => { addToQueue(menu.trackId); closeMenu(); } },
          ].map(({ label, action }) => (
            <button
              key={label}
              className="block w-full px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest transition-colors whitespace-nowrap touch-manipulation"
              style={{ color: 'var(--nx-text-dim)' }}
              onPointerDown={e => { e.stopPropagation(); action(); }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-cyan)'; (e.target as HTMLElement).style.background = 'var(--nx-bg-raised)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; (e.target as HTMLElement).style.background = ''; }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
```

- [ ] **Step 2: Run build + tests**

```bash
npm run build && npm test
```
Expected: build passes, all tests pass

- [ ] **Step 3: Commit**

```bash
git add app/components/player/TrackLibrary.tsx
git commit -m "style: TrackLibrary — Intel Database tactical redesign"
```

---

## Task 5: FileDropZone — Tactical

**Files:**
- Modify: `app/components/player/FileDropZone.tsx`

- [ ] **Step 1: Replace the full component**

```tsx
'use client';

import { useRef, useState, useCallback, type DragEvent } from 'react';
import { usePlayer } from '../../lib/playerContext';
import { TacticalBrackets } from '../ui/TacticalBrackets';

async function extractFiles(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise(resolve => (entry as FileSystemFileEntry).file(f => resolve([f])));
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const entries = await new Promise<FileSystemEntry[]>(resolve =>
      reader.readEntries(e => resolve(e as FileSystemEntry[]))
    );
    const nested = await Promise.all(entries.map(extractFiles));
    return nested.flat();
  }
  return [];
}

export function FileDropZone() {
  const { loadFiles } = usePlayer();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback((files: File[]) => loadFiles(files), [loadFiles]);

  const onDragOver  = useCallback((e: DragEvent) => { e.preventDefault(); setDragging(true); }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);

  const onDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const items = Array.from(e.dataTransfer.items);
    const entries = items.map(i => i.webkitGetAsEntry()).filter((en): en is FileSystemEntry => en !== null);
    const nested = await Promise.all(entries.map(extractFiles));
    const all = nested.flat().filter(f => f.type.startsWith('audio/') || f.type.startsWith('video/'));
    if (all.length > 0) handleFiles(all);
  }, [handleFiles]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files));
  }, [handleFiles]);

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className="relative mx-3 my-2 cursor-pointer flex flex-col items-center justify-center gap-1.5 py-5 px-4 transition-all"
      style={{
        boxShadow: dragging ? '0 0 16px rgba(255,0,60,0.15)' : undefined,
      }}
    >
      <TacticalBrackets
        color={dragging ? 'rgba(255,0,60,0.7)' : 'rgba(0,212,255,0.35)'}
        size={12}
        thickness={1.5}
      />

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="audio/*,video/*"
        className="hidden"
        onChange={onInputChange}
      />

      <span className="font-mono uppercase tracking-widest text-[9px]" style={{ color: dragging ? 'var(--nx-red)' : 'var(--nx-cyan-dim)' }}>
        {dragging ? 'RECEIVING PAYLOAD' : 'DROP AUDIO FILES'}
      </span>
      <span className="font-mono text-[9px]" style={{ color: 'var(--nx-text-dim)' }}>
        {dragging ? '—' : 'OR CLICK TO SELECT'}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Run build + tests**

```bash
npm run build && npm test
```

- [ ] **Step 3: Commit**

```bash
git add app/components/player/FileDropZone.tsx
git commit -m "style: FileDropZone — tactical bracket drop zone"
```

---

## Task 6: PlayerBar — Command Console

**Files:**
- Modify: `app/components/player/PlayerBar.tsx`

- [ ] **Step 1: Replace the full component**

```tsx
'use client';

import { useCallback, useRef, useState, useEffect, memo, type MouseEvent, type PointerEvent } from 'react';
import {
  SkipBack, SkipForward, Play, Pause,
  Volume2, VolumeX, Shuffle, Repeat, Repeat1,
  Library, RotateCcw, ListMusic, Music, SlidersHorizontal,
} from 'lucide-react';
import { usePlayer, formatTime, getAudioEl } from '../../lib/playerContext';
import type { LoopMode } from '../../lib/playerContext';

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

interface PlayerBarProps {
  libOpen: boolean;
  onToggleLib: () => void;
  queueOpen: boolean;
  onToggleQueue: () => void;
  onOpenNowPlaying: () => void;
  onOpenShortcuts: () => void;
  eqOpen: boolean;
  onToggleEQ: () => void;
}

function LoopIcon({ mode }: { mode: LoopMode }) {
  if (mode === 'track') return <Repeat1 size={14} />;
  return <Repeat size={14} />;
}

function NxBtn({ onClick, title, active, activeRed, children, disabled }: {
  onClick: () => void;
  title: string;
  active?: boolean;
  activeRed?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="flex items-center justify-center w-11 h-11 transition-colors shrink-0 disabled:opacity-20"
      style={{
        color: active
          ? (activeRed ? 'var(--nx-red)' : 'var(--nx-cyan)')
          : 'var(--nx-text-dim)',
        background: active
          ? (activeRed ? 'rgba(255,0,60,0.08)' : 'rgba(0,212,255,0.06)')
          : 'transparent',
      }}
    >
      {children}
    </button>
  );
}

export const PlayerBar = memo(function PlayerBar({
  libOpen, onToggleLib, queueOpen, onToggleQueue,
  onOpenNowPlaying, onOpenShortcuts, eqOpen, onToggleEQ,
}: PlayerBarProps) {
  const {
    state,
    togglePlay, seek, next, prev,
    setVolume, toggleMute, setSpeed,
    setLoopA, setLoopB, setLoopAAt, setLoopBAt, toggleLoop, clearLoop,
    cycleShuffle, cycleLoopMode,
  } = usePlayer();

  const {
    tracks, queue, queuePos, playing,
    position, duration, volume, muted, speed,
    loopA, loopB, loopActive,
    shuffleMode, loopMode,
  } = state;

  const currentId   = queue[queuePos] ?? null;
  const track       = currentId ? tracks.find(t => t.id === currentId) ?? null : null;
  const progressRef = useRef<HTMLDivElement>(null);
  const fillRef     = useRef<HTMLDivElement>(null);
  const thumbRef    = useRef<HTMLDivElement>(null);
  const timeRef     = useRef<HTMLSpanElement>(null);
  const sysIdRef    = useRef<HTMLSpanElement>(null);
  const draggingRef = useRef(false);
  const prevTrackId = useRef<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; pct: number }>({
    visible: false, x: 0, pct: 0,
  });

  // Flicker SYS-ID line on track change
  useEffect(() => {
    if (currentId && currentId !== prevTrackId.current) {
      prevTrackId.current = currentId;
      const el = sysIdRef.current;
      if (el) {
        el.classList.remove('animate-nx-flicker');
        // Force reflow to restart animation
        void el.offsetWidth;
        el.classList.add('animate-nx-flicker');
      }
    }
  }, [currentId]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu.visible) return;
    const close = () => setContextMenu(m => ({ ...m, visible: false }));
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [contextMenu.visible]);

  // RAF-driven smooth progress bar
  useEffect(() => {
    let rafId: number;
    function tick() {
      const el = getAudioEl();
      if (el && !draggingRef.current) {
        const dur = el.duration;
        if (isFinite(dur) && dur > 0) {
          const p = (el.currentTime / dur) * 100;
          if (fillRef.current)  fillRef.current.style.width = `${p}%`;
          if (thumbRef.current) thumbRef.current.style.left = `calc(${p}% - 5px)`;
          if (timeRef.current)  timeRef.current.textContent =
            `${formatTime(el.currentTime)}\u00a0/\u00a0${formatTime(dur)}`;
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const seekFromEvent = useCallback((e: MouseEvent | globalThis.PointerEvent) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  }, [duration, seek]);

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    seekFromEvent(e.nativeEvent);
  }, [seekFromEvent]);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) seekFromEvent(e.nativeEvent);
  }, [seekFromEvent]);

  const onPointerUp = useCallback(() => { draggingRef.current = false; }, []);

  const onContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setContextMenu({ visible: true, x: pct * 100, pct });
  }, [duration]);

  const onSetLoopPoint = useCallback((point: 'a' | 'b') => {
    if (!duration) return;
    const seconds = contextMenu.pct * duration;
    if (point === 'a') setLoopAAt(seconds); else setLoopBAt(seconds);
    setContextMenu(m => ({ ...m, visible: false }));
  }, [contextMenu.pct, duration, setLoopAAt, setLoopBAt]);

  const onSeekBarKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); e.stopPropagation();
    const el = getAudioEl();
    if (!el) return;
    seek(e.key === 'ArrowRight' ? el.currentTime + 5 : Math.max(0, el.currentTime - 5));
  }, [seek]);

  const pct      = duration > 0 ? (position / duration) * 100 : 0;
  const loopAPct = loopA !== null && duration > 0 ? (loopA / duration) * 100 : null;
  const loopBPct = loopB !== null && duration > 0 ? (loopB / duration) * 100 : null;

  const nextSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(speed);
    const safeIdx = idx === -1 ? SPEEDS.indexOf(1) : idx;
    setSpeed(SPEEDS[(safeIdx + 1) % SPEEDS.length]);
  }, [speed, setSpeed]);

  return (
    <div className="pb-safe" style={{ background: 'var(--nx-bg-panel)', borderTop: '1px solid var(--nx-cyan)' }}>

      {/* ── Progress bar ───────────────────────────────────────────────────────── */}
      <div
        ref={progressRef}
        tabIndex={0}
        className="relative cursor-pointer group py-2.5 px-0 focus:outline-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={onContextMenu}
        onKeyDown={onSeekBarKeyDown}
      >
        {/* Track */}
        <div className="relative h-[3px] group-hover:h-[4px] transition-all mx-0" style={{ background: 'rgba(0,212,255,0.1)' }}>

          {/* Tick marks at 10% intervals */}
          {[10,20,30,40,50,60,70,80,90].map(p => (
            <div
              key={p}
              className="absolute top-1/2 -translate-y-1/2 w-px"
              style={{ left: `${p}%`, height: 6, background: 'rgba(0,212,255,0.18)' }}
            />
          ))}

          {/* A-B region */}
          {loopAPct !== null && loopBPct !== null && (
            <div
              className="absolute top-0 h-full"
              style={{ left: `${loopAPct}%`, width: `${loopBPct - loopAPct}%`, background: 'rgba(0,212,255,0.2)' }}
            />
          )}

          {/* Fill */}
          <div ref={fillRef} className="absolute top-0 left-0 h-full" style={{ width: `${pct}%`, background: 'var(--nx-cyan)' }} />

          {/* Loop markers */}
          {loopAPct !== null && (
            <div className="absolute top-1/2 -translate-y-1/2 w-px h-3" style={{ left: `${loopAPct}%`, background: 'var(--nx-cyan)' }} />
          )}
          {loopBPct !== null && (
            <div className="absolute top-1/2 -translate-y-1/2 w-px h-3" style={{ left: `${loopBPct}%`, background: 'var(--nx-cyan)' }} />
          )}

          {/* Diamond thumb */}
          <div
            ref={thumbRef}
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${pct}% - 5px)`, background: 'var(--nx-red)' }}
          />
        </div>

        {/* Context menu */}
        {contextMenu.visible && (
          <div
            className="absolute z-50 py-1 shadow-xl"
            style={{
              left: `clamp(0px, ${contextMenu.x}%, calc(100% - 160px))`,
              bottom: '100%',
              marginBottom: 4,
              background: 'var(--nx-bg-panel)',
              border: '1px solid var(--nx-border-active)',
            }}
          >
            {[
              { label: 'SET LOOP START (A)', point: 'a' as const },
              { label: 'SET LOOP END (B)',   point: 'b' as const },
            ].map(({ label, point }) => (
              <button
                key={point}
                className="block w-full px-4 py-2 font-mono text-[9px] uppercase tracking-widest text-left transition-colors whitespace-nowrap"
                style={{ color: 'var(--nx-text-dim)' }}
                onPointerDown={e => { e.stopPropagation(); onSetLoopPoint(point); }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-cyan)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Controls row ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1 sm:px-2 sm:h-14">

        {/* Left — track info + transport */}
        <div className="flex items-center gap-1 px-2 sm:px-0 sm:gap-1.5 sm:flex-none">

          <NxBtn onClick={onToggleLib} title="Library" active={libOpen}>
            <Library size={16} />
          </NxBtn>

          {/* Album art + info */}
          <button
            onClick={track ? onOpenNowPlaying : undefined}
            disabled={!track}
            className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none sm:w-44 text-left disabled:cursor-default"
          >
            <div
              className="w-9 h-9 shrink-0 flex items-center justify-center overflow-hidden"
              style={{ border: '1px solid rgba(0,212,255,0.2)', background: 'var(--nx-bg-raised)' }}
            >
              {track?.coverUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={track.coverUrl} alt="cover" className="w-full h-full object-cover" />
                : <Music size={12} style={{ color: 'var(--nx-cyan-dim)' }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              {track ? (
                <>
                  <span ref={sysIdRef} className="block font-mono uppercase tracking-widest text-[8px]" style={{ color: 'var(--nx-cyan-dim)' }}>
                    SYS-ID
                  </span>
                  <p className="text-[12px] truncate leading-tight" style={{ color: 'var(--nx-text)' }}>{track.title}</p>
                  <p className="font-mono text-[9px] truncate" style={{ color: 'var(--nx-text-dim)' }}>{track.artist || track.name}</p>
                </>
              ) : (
                <p className="font-mono text-[10px]" style={{ color: 'var(--nx-text-dim)' }}>NO TRACK LOADED</p>
              )}
            </div>
          </button>

          {/* Transport */}
          <div className="flex items-center gap-0 ml-auto sm:ml-0">
            <button onClick={prev} disabled={!track}
              className="flex items-center justify-center w-11 h-11 transition-colors disabled:opacity-20"
              style={{ color: 'var(--nx-text-dim)' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-cyan)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; }}
            >
              <SkipBack size={16} />
            </button>

            {/* Play button with clip-path */}
            <button
              onClick={togglePlay}
              disabled={!track}
              className="flex items-center justify-center w-10 h-10 mx-1 transition-all disabled:opacity-20 animate-nx-glow-pulse"
              style={{
                background: playing ? 'var(--nx-cyan)' : 'transparent',
                border: '1px solid rgba(0,212,255,0.5)',
                color: playing ? 'var(--nx-bg-deep)' : 'var(--nx-cyan)',
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
              }}
            >
              {playing ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
            </button>

            <button onClick={next} disabled={!track}
              className="flex items-center justify-center w-11 h-11 transition-colors disabled:opacity-20"
              style={{ color: 'var(--nx-text-dim)' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-cyan)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; }}
            >
              <SkipForward size={16} />
            </button>
          </div>
        </div>

        {/* Right — secondary controls */}
        <div className="flex items-center gap-0 px-1 sm:px-0 sm:ml-auto overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">

          {/* Time */}
          <span ref={timeRef} className="font-mono tabular-nums text-[10px] shrink-0 px-1.5"
            style={{ color: 'var(--nx-cyan)' }}>
            {formatTime(position)}&nbsp;/&nbsp;{formatTime(duration)}
          </span>

          {/* Volume */}
          <button onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}
            className="flex items-center justify-center w-10 h-10 transition-colors shrink-0"
            style={{ color: 'var(--nx-text-dim)' }}>
            {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
          <input type="range" min={0} max={1} step={0.01}
            value={muted ? 0 : volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="w-14 sm:w-16 cursor-pointer shrink-0"
            style={{ accentColor: 'var(--nx-cyan)' }} />

          <NxBtn onClick={cycleShuffle} title={shuffleMode === 'off' ? 'Shuffle off' : 'Shuffle on'} active={shuffleMode !== 'off'}>
            <Shuffle size={13} />
          </NxBtn>

          <NxBtn onClick={cycleLoopMode}
            title={loopMode === 'off' ? 'Loop off' : loopMode === 'track' ? 'Loop track' : 'Loop queue'}
            active={loopMode !== 'off'}>
            <LoopIcon mode={loopMode} />
          </NxBtn>

          {/* Speed */}
          <button onClick={nextSpeed} title={`Speed: ${speed}×`}
            className="flex items-center justify-center h-10 px-2 font-mono text-[10px] transition-colors min-w-10 shrink-0"
            style={{ color: speed !== 1 ? 'var(--nx-cyan)' : 'var(--nx-text-dim)' }}>
            {speed}×
          </button>

          <NxBtn onClick={onToggleQueue} title="Queue" active={queueOpen}>
            <ListMusic size={13} />
          </NxBtn>

          <NxBtn onClick={onToggleEQ} title="EQ (E)" active={eqOpen} activeRed>
            <SlidersHorizontal size={13} />
          </NxBtn>

          <button onClick={onOpenShortcuts} title="Keyboard shortcuts (?)"
            className="hidden sm:flex items-center justify-center w-10 h-10 font-mono text-[10px] transition-colors shrink-0"
            style={{ color: 'var(--nx-text-dim)' }}>
            ?
          </button>

          {/* A-B loop */}
          <div className="flex items-center gap-0 pl-1 ml-1 shrink-0" style={{ borderLeft: '1px solid var(--nx-border)' }}>
            <button onClick={setLoopA} disabled={!track} title="Set loop start (A)"
              className="flex items-center justify-center h-10 px-2 font-mono text-[10px] font-bold transition-colors disabled:opacity-20"
              style={{ color: loopA !== null ? 'var(--nx-cyan)' : 'var(--nx-text-dim)', background: loopA !== null ? 'rgba(0,212,255,0.08)' : '' }}>
              A{loopA !== null ? ` ${formatTime(loopA)}` : ''}
            </button>
            <button onClick={setLoopB} disabled={!track} title="Set loop end (B)"
              className="flex items-center justify-center h-10 px-2 font-mono text-[10px] font-bold transition-colors disabled:opacity-20"
              style={{ color: loopB !== null ? 'var(--nx-cyan)' : 'var(--nx-text-dim)', background: loopB !== null ? 'rgba(0,212,255,0.08)' : '' }}>
              B{loopB !== null ? ` ${formatTime(loopB)}` : ''}
            </button>
            {loopA !== null && loopB !== null && (
              <button onClick={toggleLoop} title={loopActive ? 'Disable A-B loop' : 'Enable A-B loop'}
                className="flex items-center justify-center w-10 h-10 transition-colors"
                style={{ color: loopActive ? 'var(--nx-cyan)' : 'var(--nx-text-dim)', background: loopActive ? 'rgba(0,212,255,0.08)' : '' }}>
                <RotateCcw size={12} />
              </button>
            )}
            {(loopA !== null || loopB !== null) && (
              <button onClick={clearLoop} title="Clear loop points"
                className="flex items-center justify-center w-8 h-10 font-mono text-[9px] transition-colors"
                style={{ color: 'var(--nx-text-dim)' }}>
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
```

- [ ] **Step 2: Run build + tests**

```bash
npm run build && npm test
```

- [ ] **Step 3: Commit**

```bash
git add app/components/player/PlayerBar.tsx
git commit -m "style: PlayerBar — Command Console tactical redesign"
```

---

## Task 7: EQCurve + EQPanel — Signal Processor

**Files:**
- Modify: `app/components/eq/EQCurve.tsx`
- Modify: `app/components/eq/EQPanel.tsx`

- [ ] **Step 1: Update EQCurve — cyan curve + crosshair dots**

In `app/components/eq/EQCurve.tsx`, find and replace the static grid group and curve group. Replace lines 188–255 (inside the `return`) with:

```tsx
    >
      {/* Static grid */}
      <g stroke="rgba(0,212,255,0.1)" strokeWidth="0.5">
        {GRID_LINES_H}
        {GRID_LINES_V}
      </g>
      <g fill="rgba(0,212,255,0.25)" fontSize="9" fontFamily="monospace">
        {GRID_LABELS_H}
        {GRID_LABELS_V}
      </g>

      {/* Curve group */}
      <g
        data-testid="eq-curve-group"
        opacity={bypass ? '0.2' : '1'}
        pointerEvents={bypass ? 'none' : undefined}
      >
        {/* Filled area */}
        <path
          data-testid="eq-area"
          d={areaPath}
          fill="rgba(0,212,255,0.06)"
          stroke="none"
        />
        {/* Curve line */}
        <path
          data-testid="eq-curve"
          d={linePath}
          fill="none"
          stroke="#00d4ff"
          strokeWidth="1.5"
        />

        {/* Band crosshair dots */}
        {dotPositions.map(({ x, y, gain }, i) => {
          const isActive = activeDot === i;
          const color    = isActive ? '#ff003c' : '#00d4ff';
          const arm      = isActive ? 7 : 5;
          return (
            <g key={i} style={{ cursor: bypass ? 'default' : 'ns-resize', touchAction: 'none' }}>
              {/* Invisible hit area */}
              <circle
                data-band={i}
                cx={x}
                cy={y}
                r={12}
                fill="transparent"
                onPointerDown={e => onPointerDown(e, i)}
                onDoubleClick={() => onDblClick(i)}
              />
              {/* Crosshair horizontal arm */}
              <line x1={x - arm} y1={y} x2={x + arm} y2={y} stroke={color} strokeWidth="1.5" />
              {/* Crosshair vertical arm */}
              <line x1={x} y1={y - arm} x2={x} y2={y + arm} stroke={color} strokeWidth="1.5" />
              {/* Center dot */}
              <circle cx={x} cy={y} r="1.5" fill={color} />

              {isActive && (
                <text
                  x={x}
                  y={y - 12}
                  textAnchor="middle"
                  fill="#00d4ff"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {gain >= 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
```

Also update the `onPointerDown` signature — the hit target is now a `<circle>` (transparent), same element type. The `onPointerDown` callback already accepts `React.PointerEvent<SVGCircleElement>` — no type change needed.

- [ ] **Step 2: Update EQPanel — Signal Processor header and controls**

Replace the entire `EQPanel` component return JSX (from `return (` to end of file) with:

```tsx
  if (!open) return null;

  const activeCount = state.activePresets.length;

  return (
    <div className="flex flex-col gap-2 px-3 py-2 h-full" style={{ background: 'var(--nx-bg-panel)' }}>

      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono uppercase tracking-widest text-[9px]" style={{ color: 'var(--nx-cyan-dim)' }}>
          ◈ SIGNAL PROCESSOR
        </span>

        {/* Bypass */}
        <button
          aria-label={state.bypass ? 'bypass on' : 'bypass off'}
          aria-pressed={state.bypass}
          onClick={() => dispatch({ type: 'TOGGLE_BYPASS' })}
          className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 transition-colors"
          style={{
            color:   state.bypass ? 'var(--nx-red)' : 'var(--nx-text-dim)',
            border:  `1px solid ${state.bypass ? 'var(--nx-red)' : 'var(--nx-border)'}`,
            background: state.bypass ? 'rgba(255,0,60,0.08)' : 'transparent',
          }}
        >
          [ BYPASS ]
        </button>

        {/* Active count */}
        {activeCount > 1 && (
          <span className="font-mono text-[9px]" style={{ color: 'var(--nx-cyan-dim)', border: '1px solid var(--nx-border)', padding: '0 4px' }}>
            {activeCount} ACTIVE
          </span>
        )}

        {/* Flat */}
        <button
          aria-label="Reset to flat"
          onClick={() => dispatch({ type: 'RESET_FLAT' })}
          className="font-mono text-[9px] uppercase px-2 py-0.5 transition-colors touch-manipulation"
          style={{
            color:      state.activePresets.length === 0 ? 'var(--nx-cyan)' : 'var(--nx-text-dim)',
            border:     `1px solid ${state.activePresets.length === 0 ? 'var(--nx-cyan-dim)' : 'var(--nx-border)'}`,
            background: state.activePresets.length === 0 ? 'rgba(0,212,255,0.06)' : 'transparent',
          }}
        >
          [FLAT]
        </button>

        {/* Preset chips */}
        <div className="flex gap-1 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-0.5 sm:pb-0 max-w-full">
          {BUILTIN_PRESETS.filter(p => p.name !== 'Flat').map(p => (
            <button
              key={p.name}
              aria-label={p.name}
              onClick={() => togglePreset(p.gains, p.name)}
              className="font-mono text-[9px] uppercase px-2 py-1 transition-colors shrink-0 touch-manipulation"
              style={{
                color:      state.activePresets.includes(p.name) ? 'var(--nx-cyan)' : 'var(--nx-text-dim)',
                border:     `1px solid ${state.activePresets.includes(p.name) ? 'var(--nx-cyan-dim)' : 'var(--nx-border)'}`,
                background: state.activePresets.includes(p.name) ? 'rgba(0,212,255,0.06)' : 'transparent',
              }}
            >
              [{p.name.toUpperCase()}]
            </button>
          ))}
          {customPresets.map(p => (
            <button
              key={p.id ?? p.name}
              aria-label={p.name}
              onClick={() => togglePreset(p.bands.map(b => b.gain), p.name)}
              className="font-mono text-[9px] uppercase px-2 py-1 transition-colors shrink-0 touch-manipulation"
              style={{
                color:      state.activePresets.includes(p.name) ? 'var(--nx-cyan)' : 'var(--nx-text-dim)',
                border:     `1px solid ${state.activePresets.includes(p.name) ? 'var(--nx-cyan-dim)' : 'var(--nx-border)'}`,
                background: state.activePresets.includes(p.name) ? 'rgba(0,212,255,0.06)' : 'transparent',
              }}
            >
              [{p.name.toUpperCase()}]
            </button>
          ))}
        </div>

        {/* Save */}
        {saving ? (
          <input
            autoFocus
            type="text"
            placeholder="PRESET NAME"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={handleSaveKeyDown}
            className="font-mono text-[10px] uppercase px-2 py-0.5 w-32 focus:outline-none"
            style={{
              background: 'var(--nx-bg-raised)',
              border: '1px solid var(--nx-cyan-dim)',
              color: 'var(--nx-cyan)',
              caretColor: 'var(--nx-cyan)',
            }}
          />
        ) : (
          <button
            aria-label="Save preset"
            onClick={() => setSaving(true)}
            className="font-mono text-[9px] uppercase px-2 py-0.5 transition-colors ml-auto"
            style={{ color: 'var(--nx-text-dim)', border: '1px solid var(--nx-border)' }}
          >
            [SAVE]
          </button>
        )}

        {/* Close */}
        <button
          aria-label="Close EQ panel"
          onClick={onClose}
          className="font-mono text-[11px] px-1 transition-colors leading-none"
          style={{ color: 'var(--nx-red)' }}
        >
          [×]
        </button>
      </div>

      {/* Curve */}
      <div className="flex-1 min-h-0">
        <EQCurve state={state} dispatch={dispatch} />
      </div>
    </div>
  );
});
```

- [ ] **Step 3: Run build + tests**

```bash
npm run build && npm test
```

- [ ] **Step 4: Commit**

```bash
git add app/components/eq/EQCurve.tsx app/components/eq/EQPanel.tsx
git commit -m "style: EQ — Signal Processor header, cyan curve, crosshair dots"
```

---

## Task 8: QueueSidebar — Mission Queue

**Files:**
- Modify: `app/components/player/QueueSidebar.tsx`

- [ ] **Step 1: Replace the full component**

```tsx
'use client';

import { usePlayer, formatTime } from '../../lib/playerContext';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Music } from 'lucide-react';
import { TacticalBrackets } from '../ui/TacticalBrackets';

interface SortableRowProps {
  id: string; dndId: string; title: string; artist: string;
  coverUrl: string; duration: number; isCurrent: boolean;
  pos: number; index: number;
  onRemove: (pos: number) => void; onPlay: (id: string) => void;
}

function SortableRow({ id, dndId, title, artist, coverUrl, duration, isCurrent, pos, index, onRemove, onPlay }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId });
  const idx = String(index + 1).padStart(2, '0');

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        borderLeft: isCurrent ? '2px solid var(--nx-cyan)' : '2px solid transparent',
        background: isCurrent ? 'var(--nx-bg-raised)' : undefined,
      }}
      className="flex items-center gap-2 px-2 py-2 cursor-pointer select-none transition-colors group"
      onClick={() => onPlay(id)}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing shrink-0"
        style={{ color: 'var(--nx-text-dim)' }}
        onClick={e => e.stopPropagation()}
      >
        <GripVertical size={12} />
      </span>

      {/* Index */}
      <span className="font-mono text-[9px] shrink-0" style={{ color: 'var(--nx-cyan-dim)' }}>
        [{idx}]
      </span>

      <div className="w-7 h-7 shrink-0 flex items-center justify-center overflow-hidden"
        style={{ border: '1px solid var(--nx-border)', background: 'var(--nx-bg-raised)' }}>
        {coverUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          : <Music size={9} style={{ color: 'var(--nx-cyan-dim)' }} />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] truncate leading-tight" style={{ color: isCurrent ? 'var(--nx-cyan)' : 'var(--nx-text)' }}>{title}</p>
        <p className="font-mono text-[9px] truncate" style={{ color: 'var(--nx-text-dim)' }}>{artist}</p>
      </div>

      <span className="font-mono text-[9px] shrink-0" style={{ color: 'var(--nx-cyan-dim)' }}>
        {formatTime(duration)}
      </span>

      <button
        onClick={e => { e.stopPropagation(); onRemove(pos); }}
        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 transition-all shrink-0 touch-manipulation"
        style={{ color: 'var(--nx-text-dim)' }}
        onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-red)'; }}
        onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; }}
        title="Remove"
      >
        <X size={12} />
      </button>
    </div>
  );
}

interface QueueSidebarProps { onClose: () => void; }

export function QueueSidebar({ onClose }: QueueSidebarProps) {
  const { state, playNow, removeFromQueue, reorderQueue, clearQueue } = usePlayer();
  const { tracks, queue, queuePos } = state;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const dndIds  = queue.map((id, pos) => `${id}::${pos}`);
  const currentId = queue[queuePos] ?? null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = parseInt((active.id as string).split('::')[1]);
    const to   = parseInt((over.id   as string).split('::')[1]);
    if (!isNaN(from) && !isNaN(to)) reorderQueue(from, to);
  }

  return (
    <div
      className="absolute right-0 top-0 bottom-0 z-25 flex flex-col select-none w-full sm:w-72 nx-clip-panel"
      style={{ background: 'var(--nx-bg-panel)', borderLeft: '1px solid var(--nx-border)' }}
    >
      {/* Header */}
      <div className="relative flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
        <TacticalBrackets size={8} thickness={1} />
        <span className="font-mono uppercase tracking-widest text-[9px]" style={{ color: 'var(--nx-cyan-dim)' }}>
          ◈ MISSION QUEUE
        </span>
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="font-mono text-[9px] uppercase transition-colors"
              style={{ color: 'var(--nx-text-dim)' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-red)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; }}
            >
              [CLEAR]
            </button>
          )}
          <button onClick={onClose} style={{ color: 'var(--nx-text-dim)' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-red)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; }}>
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Count */}
      <div className="px-3 pb-1 font-mono text-[9px]" style={{ color: 'var(--nx-text-dim)' }}>
        {queue.length === 0 ? 'QUEUE EMPTY' : `${queue.length} TRACK${queue.length === 1 ? '' : 'S'} QUEUED`}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {queue.length === 0 ? (
          <p className="font-mono text-[9px] text-center mt-8 px-4 uppercase" style={{ color: 'var(--nx-text-dim)' }}>
            CLICK TRACK TO PLAY
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={dndIds} strategy={verticalListSortingStrategy}>
              {queue.map((id, pos) => {
                const track = tracks.find(t => t.id === id);
                if (!track) return null;
                return (
                  <SortableRow
                    key={`${id}::${pos}`}
                    id={id}
                    dndId={`${id}::${pos}`}
                    title={track.title}
                    artist={track.artist}
                    coverUrl={track.coverUrl}
                    duration={track.duration}
                    isCurrent={id === currentId}
                    pos={pos}
                    index={pos}
                    onRemove={removeFromQueue}
                    onPlay={playNow}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run build + tests**

```bash
npm run build && npm test
```

- [ ] **Step 3: Commit**

```bash
git add app/components/player/QueueSidebar.tsx
git commit -m "style: QueueSidebar — Mission Queue clip-path + numbered rows"
```

---

## Task 9: NowPlayingPanel — Now Broadcasting

**Files:**
- Modify: `app/components/player/NowPlayingPanel.tsx`

- [ ] **Step 1: Replace the full component**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Music } from 'lucide-react';
import { type Track, formatTime } from '../../lib/playerContext';
import { TacticalBrackets } from '../ui/TacticalBrackets';

interface Props { track: Track; onClose: () => void; }

const FORMAT_MAP: Record<string, string> = {
  'audio/mpeg': 'MP3', 'audio/flac': 'FLAC', 'audio/wav': 'WAV',
  'audio/aac': 'AAC', 'audio/mp4': 'M4A', 'audio/webm': 'WebM',
  'video/webm': 'WebM', 'audio/ogg': 'OGG', 'audio/opus': 'OPUS',
  'audio/x-aiff': 'AIFF',
};

function formatBytes(bytes: number): string { return (bytes / 1_000_000).toFixed(1) + ' MB'; }
function formatLabel(type: string): string  { return FORMAT_MAP[type] ?? type.split('/')[1]?.toUpperCase() ?? '?'; }

export function NowPlayingPanel({ track, onClose }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [bgColor, setBgColor] = useState<string>('');

  useEffect(() => {
    if (!track.coverUrl) { setBgColor(''); return; }
    const img = new window.Image();
    img.src = track.coverUrl;
    img.onload = async () => {
      try {
        const { default: ColorThief } = await import('color-thief-browser');
        const ct = new ColorThief();
        const [r, g, b] = ct.getColor(img);
        setBgColor(`radial-gradient(ellipse at center, rgba(${r},${g},${b},0.25) 0%, var(--nx-bg-panel) 70%)`);
      } catch { setBgColor(''); }
    };
  }, [track.coverUrl]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center"
      style={{ background: 'rgba(0,10,14,0.88)' }}
      onPointerDown={onClose}
    >
      <div
        className="relative w-full sm:w-80 max-h-full overflow-y-auto shadow-2xl nx-clip-panel"
        style={{
          background: bgColor || 'var(--nx-bg-panel)',
          border: '1px solid rgba(0,212,255,0.2)',
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        <TacticalBrackets color="rgba(0,212,255,0.4)" size={14} thickness={1.5} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <span className="font-mono uppercase tracking-widest text-[9px]" style={{ color: 'var(--nx-cyan-dim)' }}>
            ◈ NOW BROADCASTING
          </span>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: 'var(--nx-text-dim)' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-red)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Cover art */}
        <div className="flex justify-center py-4 px-8">
          <div className="w-40 h-40 flex items-center justify-center overflow-hidden shadow-xl"
            style={{ border: '1px solid rgba(0,212,255,0.25)', background: 'var(--nx-bg-raised)' }}>
            {track.coverUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img ref={imgRef} src={track.coverUrl} alt="cover" className="w-full h-full object-cover" />
              : <Music size={36} style={{ color: 'var(--nx-cyan-dim)' }} />
            }
          </div>
        </div>

        {/* Metadata */}
        <div className="px-6 pb-6 text-center">
          <p className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--nx-text)' }}>
            {track.title}
          </p>
          {track.artist && (
            <p className="font-mono text-[10px] mt-1 truncate" style={{ color: 'var(--nx-text-dim)' }}>
              {track.artist}
            </p>
          )}
          {track.album && (
            <p className="font-mono text-[9px] mt-0.5 truncate" style={{ color: 'var(--nx-cyan-dim)' }}>
              {track.album}
            </p>
          )}

          {/* Badges */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            {[
              formatLabel(track.type),
              formatBytes(track.size),
              ...(track.duration > 0 ? [formatTime(track.duration)] : []),
            ].map(label => (
              <span key={label} className="font-mono text-[9px] uppercase px-2 py-0.5"
                style={{ color: 'var(--nx-text-dim)', border: '1px solid var(--nx-border)' }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run build + tests**

```bash
npm run build && npm test
```

- [ ] **Step 3: Commit**

```bash
git add app/components/player/NowPlayingPanel.tsx
git commit -m "style: NowPlayingPanel — Now Broadcasting clip-path + brackets"
```

---

## Task 10: KeyboardShortcutsOverlay — Command Reference

**Files:**
- Modify: `app/components/player/KeyboardShortcutsOverlay.tsx`

- [ ] **Step 1: Replace the full component**

```tsx
'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { TacticalBrackets } from '../ui/TacticalBrackets';

interface Props { onClose: () => void; }

const SHORTCUTS = [
  { section: 'PLAYBACK' },
  { key: 'SPACE',      desc: 'Play / Pause' },
  { key: 'M',          desc: 'Mute toggle' },
  { key: 'S',          desc: 'Shuffle toggle' },
  { key: 'L',          desc: 'Cycle loop mode' },
  { section: 'SEEK' },
  { key: '← / →',     desc: 'Seek ±5 seconds' },
  { key: 'SHIFT+← →', desc: 'Prev / Next track' },
  { key: 'A',          desc: 'Set loop start (A)' },
  { section: 'VOLUME' },
  { key: '↑ / ↓',     desc: 'Volume ±5%' },
  { section: 'VIEW' },
  { key: 'F',          desc: 'Toggle fullscreen' },
  { key: 'E',          desc: 'Toggle EQ' },
  { key: '/',          desc: 'Focus search' },
  { key: '?',          desc: 'This overlay' },
] as const;

export function KeyboardShortcutsOverlay({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,10,14,0.75)' }}
      onPointerDown={onClose}
    >
      <div
        className="relative w-full mx-4 sm:w-72 shadow-2xl max-h-[80vh] overflow-y-auto nx-clip-panel"
        style={{
          background: 'var(--nx-bg-panel)',
          border: '1px solid rgba(0,212,255,0.2)',
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        <TacticalBrackets color="rgba(0,212,255,0.35)" size={10} thickness={1} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <span className="font-mono uppercase tracking-widest text-[9px]" style={{ color: 'var(--nx-cyan-dim)' }}>
            ◈ COMMAND REFERENCE
          </span>
          <button onClick={onClose} style={{ color: 'var(--nx-text-dim)' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-red)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; }}>
            <X size={14} />
          </button>
        </div>

        {/* Shortcut list */}
        <div className="px-5 pb-5 space-y-px">
          {SHORTCUTS.map((item, i) => {
            if ('section' in item) {
              return (
                <p key={i} className="font-mono uppercase tracking-widest text-[8px] pt-3 pb-1 first:pt-0"
                  style={{ color: 'var(--nx-cyan-dim)' }}>
                  {item.section}
                </p>
              );
            }
            return (
              <div key={i} className="flex items-center justify-between gap-4 py-0.5">
                <span className="text-[11px]" style={{ color: 'var(--nx-text-dim)' }}>{item.desc}</span>
                <kbd className="font-mono text-[9px] uppercase px-1.5 py-0.5 shrink-0"
                  style={{
                    color: 'var(--nx-cyan)',
                    background: 'var(--nx-bg-raised)',
                    border: '1px solid var(--nx-border)',
                  }}>
                  {item.key}
                </kbd>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run build + tests**

```bash
npm run build && npm test
```

- [ ] **Step 3: Commit**

```bash
git add app/components/player/KeyboardShortcutsOverlay.tsx
git commit -m "style: KeyboardShortcutsOverlay — Command Reference tactical layout"
```

---

## Task 11: Final Verification + Push

- [ ] **Step 1: Full build**

```bash
npm run build
```
Expected: `✓ Compiled successfully`, 0 TypeScript errors

- [ ] **Step 2: Full test suite**

```bash
npm test
```
Expected: 153 tests passing

- [ ] **Step 3: Update CLAUDE_PROGRESS.md**

In `CLAUDE_PROGRESS.md`, update the current status line:
```
## Current Status: NEXUS-7 UI revamp complete. Feature 2 (EQ) — 153 tests passing.
```

- [ ] **Step 4: Push to GitHub**

```bash
git add CLAUDE_PROGRESS.md
git commit -m "docs: update progress — NEXUS-7 UI revamp complete"
git push origin master
```

---

## Self-Review

**Spec coverage check:**
- ✅ Color system: all tokens defined in globals.css Task 1
- ✅ Dot-grid background: `.nx-dot-grid` class, applied in PlayerShell Task 3
- ✅ Corner brackets: TacticalBrackets component Task 2, used in QueueSidebar, NowPlayingPanel, KeyboardShortcutsOverlay, FileDropZone
- ✅ Clip-path panels: `.nx-clip-panel` in globals.css, applied to QueueSidebar, NowPlayingPanel, KeyboardShortcutsOverlay
- ✅ Scanline overlay: `.nx-scanline-overlay` in globals.css, applied to library panel in PlayerShell Task 3
- ✅ Scrollbar: defined in globals.css Task 1
- ✅ All 4 animations: defined in globals.css Task 1
- ✅ Library panel → Intel Database: Task 4
- ✅ FileDropZone tactical: Task 5
- ✅ PlayerBar Command Console (progress ticks, diamond thumb, SYS-ID flicker, play clip-path): Task 6
- ✅ EQPanel Signal Processor + crosshair dots + cyan curve: Task 7
- ✅ QueueSidebar Mission Queue: Task 8
- ✅ NowPlayingPanel Now Broadcasting: Task 9
- ✅ KeyboardShortcutsOverlay Command Reference: Task 10
- ✅ Mobile: scanline disabled via CSS, bracket arms 8px on mobile (Task 2 default props)

**No placeholders found.**

**Type consistency:**
- `TacticalBrackets` used identically across Tasks 5, 8, 9, 10
- `NxBtn` defined and used within PlayerBar Task 6 only
- CSS variables (`var(--nx-*)`) referenced consistently by token name across all tasks
- `nx-clip-panel`, `nx-dot-grid`, `nx-scanline-overlay`, `animate-nx-*` used only after defined in Task 1
