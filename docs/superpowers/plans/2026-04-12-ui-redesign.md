# FineTune UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the NEXUS-7 cyberpunk theme with the CLAUDE.md design system (Syne font, amber accent, neutral dark palette, clean layout) without changing any functional code.

**Architecture:** Pure visual layer swap. All CSS variables replaced, all `--nx-*` references updated, `TacticalBrackets` component deleted. No changes to reducers, Web Audio graph, hooks, or component interfaces.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Syne (Google Fonts)

---

## File Map

| File | Change |
|------|--------|
| `app/globals.css` | Full replacement — CLAUDE.md tokens, Syne import, remove all nx-* |
| `app/layout.tsx` | Remove Geist, add Syne via next/font/google |
| `app/components/ui/TacticalBrackets.tsx` | **Delete** |
| `app/components/player/FileDropZone.tsx` | Remove TacticalBrackets, amber hover state |
| `app/components/player/NowPlayingStage.tsx` | Remove TacticalBrackets, clean minimal layout, amber chips |
| `app/components/player/NowPlayingPanel.tsx` | Remove TacticalBrackets, amber accent, clean header |
| `app/components/player/KeyboardShortcutsOverlay.tsx` | Remove TacticalBrackets, amber keys |
| `app/components/player/QueueSidebar.tsx` | Remove TacticalBrackets, amber active track |
| `app/components/player/TrackLibrary.tsx` | Amber active track, clean search, remove nx-* |
| `app/components/player/PlayerBar.tsx` | Amber accent, remove nx-* and SYS-ID label, clean play button |
| `app/components/player/PlayerShell.tsx` | 3-col layout, 240px sidebar, remove dot-grid |
| `app/components/eq/EQCurve.tsx` | Amber curve and dots |
| `app/components/eq/EQPanel.tsx` | Amber preset chips, bypass toggle |

---

## Task 1: globals.css + layout.tsx — Design Tokens and Font

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace globals.css entirely**

```css
@import "tailwindcss";

/* ── CLAUDE.md Design Tokens ─────────────────────────────────────────────── */
:root {
  /* Backgrounds — darkest to lightest */
  --bg:  #060606;
  --s1:  #0D0D0D;
  --s2:  #141414;
  --s3:  #1C1C1C;
  --s4:  #242424;
  --s5:  #2E2E2E;

  /* Border — one value for everything */
  --br:  rgba(255, 255, 255, 0.07);

  /* Text */
  --t1:  #F2F2F2;
  --t2:  #777777;
  --t3:  #333333;

  /* Primary accent */
  --a:       #F59E0B;

  /* Semantic accents */
  --green:   #22C55E;
  --blue:    #38BDF8;
  --purple:  #A78BFA;
  --pink:    #EC4899;
  --orange:  #F97316;
}

@theme inline {
  --color-background: var(--bg);
  --color-foreground: var(--t1);
  --font-sans: var(--font-syne);
}

/* ── Base ────────────────────────────────────────────────────────────────── */
body {
  background: var(--bg);
  color: var(--t1);
  font-family: 'Syne', system-ui, sans-serif;
}

html, body {
  overscroll-behavior: none;
}

/* ── iOS safe-area ───────────────────────────────────────────────────────── */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* ── Scrollbar ───────────────────────────────────────────────────────────── */
::-webkit-scrollbar       { width: 2px; height: 2px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.3); }
::-webkit-scrollbar-thumb:hover { background: rgba(245, 158, 11, 0.5); }

/* ── Mobile bottom sheet slide-up ────────────────────────────────────────── */
@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

@utility animate-slide-up {
  animation: slideUp 0.2s ease;
}
```

- [ ] **Step 2: Replace layout.tsx entirely**

```tsx
import type { Metadata, Viewport } from "next";
import { Syne } from "next/font/google";
import { Toaster } from 'sonner';
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "FineTune",
  description: "Local-first browser media player",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="bottom-center" theme="dark" />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Run tests to confirm nothing broke**

```bash
npx vitest run
```

Expected: all tests pass (no logic changed).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: replace NEXUS-7 tokens with CLAUDE.md design system, Syne font"
```

---

## Task 2: Delete TacticalBrackets

**Files:**
- Delete: `app/components/ui/TacticalBrackets.tsx`

- [ ] **Step 1: Delete the file**

```bash
rm app/components/ui/TacticalBrackets.tsx
```

- [ ] **Step 2: Run build to surface any remaining imports**

```bash
npx tsc --noEmit
```

Expected: errors for every file that still imports `TacticalBrackets` — those are the next tasks. Confirm the list matches: `FileDropZone`, `NowPlayingStage`, `NowPlayingPanel`, `QueueSidebar`, `KeyboardShortcutsOverlay`.

- [ ] **Step 3: Commit (build broken — next tasks fix it)**

```bash
git add app/components/ui/TacticalBrackets.tsx
git commit -m "feat: delete TacticalBrackets — replaced by CLAUDE.md clean borders"
```

---

## Task 3: FileDropZone.tsx

**Files:**
- Modify: `app/components/player/FileDropZone.tsx`

- [ ] **Step 1: Replace file entirely**

```tsx
'use client';

import { useRef, useState, useCallback, type DragEvent } from 'react';
import { usePlayer } from '../../lib/playerContext';

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
      className="mx-3 my-2 cursor-pointer flex flex-col items-center justify-center gap-1 py-4 px-4 transition-all rounded-lg"
      style={{
        border: dragging ? '1px dashed #f59e0b' : '1px dashed var(--br)',
        background: dragging ? '#f59e0b08' : 'var(--s2)',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="audio/*,video/*"
        className="hidden"
        onChange={onInputChange}
      />
      <span
        className="text-[11px] font-semibold"
        style={{ color: dragging ? 'var(--a)' : 'var(--t2)', fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700 }}
      >
        {dragging ? 'Drop to add' : 'Add files'}
      </span>
      <span
        className="text-[9.5px]"
        style={{ color: 'var(--t3)', fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 500 }}
      >
        {dragging ? '' : 'drag & drop or click'}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/components/player/FileDropZone.tsx
git commit -m "feat: FileDropZone — amber drag state, CLAUDE.md design"
```

---

## Task 4: KeyboardShortcutsOverlay.tsx

**Files:**
- Modify: `app/components/player/KeyboardShortcutsOverlay.tsx`

- [ ] **Step 1: Replace file entirely**

```tsx
'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const SHORTCUTS = [
  { section: 'Playback' },
  { key: 'Space', desc: 'Play / Pause' },
  { key: 'M', desc: 'Mute toggle' },
  { key: 'S', desc: 'Shuffle toggle' },
  { key: 'L', desc: 'Cycle loop mode' },
  { section: 'Seek' },
  { key: '← / →', desc: 'Seek ±5 seconds' },
  { key: 'Shift+← / →', desc: 'Previous / Next track' },
  { key: 'A', desc: 'Set loop start (A point)' },
  { section: 'Volume' },
  { key: '↑ / ↓', desc: 'Volume ±5%' },
  { section: 'View' },
  { key: 'F', desc: 'Toggle fullscreen' },
  { key: 'E', desc: 'Toggle EQ' },
  { key: '/', desc: 'Focus search' },
  { key: '?', desc: 'Show this overlay' },
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
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onPointerDown={onClose}
    >
      <div
        className="relative px-5 py-4 w-full mx-4 sm:w-80 max-h-[80vh] overflow-y-auto"
        style={{
          background: 'var(--s1)',
          border: '1px solid var(--br)',
          borderRadius: 12,
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4" style={{ borderBottom: '1px solid var(--br)', paddingBottom: '0.75rem' }}>
          <span style={{ color: 'var(--t1)', fontSize: 14, fontWeight: 800 }}>Keyboard Shortcuts</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors touch-manipulation"
            style={{ color: 'var(--t2)', background: 'transparent' }}
            onMouseEnter={e => { (e.currentTarget).style.color = 'var(--t1)'; (e.currentTarget).style.background = 'var(--s3)'; }}
            onMouseLeave={e => { (e.currentTarget).style.color = 'var(--t2)'; (e.currentTarget).style.background = 'transparent'; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Shortcut rows */}
        <div className="space-y-0">
          {SHORTCUTS.map((item, i) => {
            if ('section' in item) {
              return (
                <p
                  key={i}
                  className="pt-3 pb-1 first:pt-0"
                  style={{ color: 'var(--t3)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--br)' }}
                >
                  {item.section}
                </p>
              );
            }
            return (
              <div key={i} className="flex items-center justify-between gap-4 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ color: 'var(--t2)', fontSize: 11, fontWeight: 500 }}>{item.desc}</span>
                <kbd
                  className="shrink-0 px-1.5 py-0.5 rounded"
                  style={{
                    color: 'var(--a)',
                    border: '1px solid #f59e0b45',
                    background: '#f59e0b18',
                    fontSize: 9,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
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

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/components/player/KeyboardShortcutsOverlay.tsx
git commit -m "feat: KeyboardShortcutsOverlay — amber keys, CLAUDE.md design"
```

---

## Task 5: NowPlayingPanel.tsx

**Files:**
- Modify: `app/components/player/NowPlayingPanel.tsx`

- [ ] **Step 1: Replace file entirely**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Music } from 'lucide-react';
import { type Track, formatTime } from '../../lib/playerContext';

interface Props {
  track: Track;
  onClose: () => void;
}

const FORMAT_MAP: Record<string, string> = {
  'audio/mpeg': 'MP3',
  'audio/flac': 'FLAC',
  'audio/wav': 'WAV',
  'audio/aac': 'AAC',
  'audio/mp4': 'M4A',
  'audio/webm': 'WEBM',
  'video/webm': 'WEBM',
  'audio/ogg': 'OGG',
  'audio/opus': 'OPUS',
  'audio/x-aiff': 'AIFF',
};

function formatBytes(bytes: number): string {
  return (bytes / 1_000_000).toFixed(1) + ' MB';
}

function formatLabel(type: string): string {
  return FORMAT_MAP[type] ?? type.split('/')[1]?.toUpperCase() ?? '?';
}

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
        setBgColor(`radial-gradient(ellipse at center, rgba(${r},${g},${b},0.25) 0%, var(--s1) 70%)`);
      } catch {
        setBgColor('');
      }
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
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onPointerDown={onClose}
    >
      <div
        className="relative overflow-hidden w-full sm:w-80 max-h-full overflow-y-auto"
        style={{
          background: bgColor || 'var(--s1)',
          border: '1px solid var(--br)',
          borderRadius: 12,
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--br)' }}>
          <span style={{ color: 'var(--t1)', fontSize: 14, fontWeight: 800 }}>Now Playing</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors touch-manipulation"
            style={{ color: 'var(--t2)', background: 'transparent' }}
            onMouseEnter={e => { (e.currentTarget).style.color = 'var(--t1)'; (e.currentTarget).style.background = 'var(--s3)'; }}
            onMouseLeave={e => { (e.currentTarget).style.color = 'var(--t2)'; (e.currentTarget).style.background = 'transparent'; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Album art */}
        <div className="flex justify-center pt-6 pb-4 px-8">
          <div
            className="w-40 h-40 overflow-hidden flex items-center justify-center"
            style={{ border: '1px solid var(--br)', background: 'var(--s2)', borderRadius: 10 }}
          >
            {track.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img ref={imgRef} src={track.coverUrl} alt="cover" className="w-full h-full object-cover" />
            ) : (
              <Music size={36} style={{ color: 'var(--t3)' }} />
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="px-6 pb-6 text-center">
          <p style={{ color: 'var(--t1)', fontSize: 20, fontWeight: 800, lineHeight: 1.3 }} className="truncate">
            {track.title}
          </p>
          {track.artist && (
            <p className="mt-1 truncate" style={{ color: 'var(--t2)', fontSize: 13, fontWeight: 500 }}>
              {track.artist}
            </p>
          )}
          {track.album && (
            <p className="mt-0.5 truncate" style={{ color: 'var(--t3)', fontSize: 11, fontWeight: 400 }}>
              {track.album}
            </p>
          )}

          {/* Badges */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <span
              className="px-2 py-0.5 rounded"
              style={{ color: 'var(--a)', border: '1px solid #f59e0b45', background: '#f59e0b18', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}
            >
              {formatLabel(track.type)}
            </span>
            <span
              className="px-2 py-0.5 rounded"
              style={{ color: 'var(--t2)', border: '1px solid var(--br)', background: 'var(--s2)', fontSize: 9, fontWeight: 500 }}
            >
              {formatBytes(track.size)}
            </span>
            {track.duration > 0 && (
              <span
                className="px-2 py-0.5 rounded"
                style={{ color: 'var(--t2)', border: '1px solid var(--br)', background: 'var(--s2)', fontSize: 9, fontWeight: 500 }}
              >
                {formatTime(track.duration)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/components/player/NowPlayingPanel.tsx
git commit -m "feat: NowPlayingPanel — amber accent, CLAUDE.md design"
```

---

## Task 6: QueueSidebar.tsx

**Files:**
- Modify: `app/components/player/QueueSidebar.tsx`

- [ ] **Step 1: Read the full current file**

Read `app/components/player/QueueSidebar.tsx` fully first.

- [ ] **Step 2: Replace the full file**

Replace the existing file with the version below. All logic (DnD, play, remove) is preserved. Only the visual layer changes.

```tsx
'use client';

import { useCallback } from 'react';
import { Music, X, GripVertical } from 'lucide-react';
import { usePlayer, formatTime } from '../../lib/playerContext';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableRowProps {
  id: string;
  dndId: string;
  title: string;
  artist: string;
  coverUrl: string;
  duration: number;
  isCurrent: boolean;
  pos: number;
  onRemove: (pos: number) => void;
  onPlay: (id: string) => void;
}

function SortableRow({ id, dndId, title, artist, coverUrl, duration, isCurrent, pos, onRemove, onPlay }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        borderLeft: isCurrent ? '2px solid var(--a)' : '2px solid transparent',
        background: isCurrent ? '#f59e0b08' : undefined,
      }}
      className="flex items-center gap-2 px-2 py-2 cursor-pointer select-none group transition-colors"
      onClick={() => onPlay(id)}
      onMouseEnter={e => {
        if (!isCurrent) {
          (e.currentTarget as HTMLDivElement).style.background = 'var(--s3)';
        }
      }}
      onMouseLeave={e => {
        if (!isCurrent) {
          (e.currentTarget as HTMLDivElement).style.background = '';
        }
      }}
    >
      {/* Drag handle */}
      <div
        className="shrink-0 cursor-grab touch-manipulation"
        style={{ color: 'var(--t3)' }}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={12} />
      </div>

      {/* Album art */}
      <div
        className="w-8 h-8 shrink-0 overflow-hidden flex items-center justify-center"
        style={{ background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 4 }}
      >
        {coverUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          : <Music size={10} style={{ color: 'var(--t3)' }} />
        }
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p
          className="truncate leading-tight"
          style={{ color: isCurrent ? 'var(--a)' : 'var(--t1)', fontSize: 11.5, fontWeight: 600 }}
        >
          {title}
        </p>
        <p className="truncate" style={{ color: 'var(--t2)', fontSize: 9.5, fontWeight: 500 }}>
          {artist}
        </p>
      </div>

      {/* Duration */}
      {duration > 0 && (
        <span className="shrink-0" style={{ color: 'var(--t2)', fontSize: 9, fontWeight: 400 }}>
          {formatTime(duration)}
        </span>
      )}

      {/* Remove */}
      <button
        className="shrink-0 flex items-center justify-center w-6 h-6 rounded transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 touch-manipulation"
        style={{ color: 'var(--t3)' }}
        onClick={e => { e.stopPropagation(); onRemove(pos); }}
        onMouseEnter={e => { (e.currentTarget).style.color = 'var(--orange)'; }}
        onMouseLeave={e => { (e.currentTarget).style.color = 'var(--t3)'; }}
      >
        <X size={10} />
      </button>
    </div>
  );
}

interface Props {
  onClose: () => void;
}

export function QueueSidebar({ onClose }: Props) {
  const { state, playNow, removeFromQueue, reorderQueue, clearQueue } = usePlayer();
  const { tracks, queue, queuePos } = state;
  const currentId = queue[queuePos] ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = queue.findIndex((_, i) => `q-${i}` === active.id);
      const newIdx = queue.findIndex((_, i) => `q-${i}` === over.id);
      if (oldIdx !== -1 && newIdx !== -1) reorderQueue(oldIdx, newIdx);
    }
  }, [queue, reorderQueue]);

  const handleRemove = useCallback((pos: number) => removeFromQueue(pos), [removeFromQueue]);
  const handlePlay   = useCallback((id: string) => playNow(id), [playNow]);

  return (
    <div
      className="absolute right-0 top-0 bottom-0 z-20 flex flex-col w-full sm:w-72"
      style={{ background: 'var(--s1)', borderLeft: '1px solid var(--br)' }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--br)' }}>
        <span style={{ color: 'var(--t1)', fontSize: 14, fontWeight: 800 }}>Queue</span>
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="px-2 py-1 rounded text-[9px] transition-colors touch-manipulation"
              style={{ color: 'var(--t2)', border: '1px solid var(--br)', background: 'transparent', fontWeight: 700 }}
              onMouseEnter={e => { (e.currentTarget).style.color = 'var(--orange)'; (e.currentTarget).style.borderColor = '#f97316'; }}
              onMouseLeave={e => { (e.currentTarget).style.color = 'var(--t2)'; (e.currentTarget).style.borderColor = 'var(--br)'; }}
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors touch-manipulation"
            style={{ color: 'var(--t2)', background: 'transparent' }}
            onMouseEnter={e => { (e.currentTarget).style.color = 'var(--t1)'; (e.currentTarget).style.background = 'var(--s3)'; }}
            onMouseLeave={e => { (e.currentTarget).style.color = 'var(--t2)'; (e.currentTarget).style.background = 'transparent'; }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto">
        {queue.length === 0 ? (
          <p className="px-4 py-6 text-center" style={{ color: 'var(--t3)', fontSize: 13, fontWeight: 500 }}>
            Queue is empty
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={queue.map((_, i) => `q-${i}`)} strategy={verticalListSortingStrategy}>
              {queue.map((trackId, pos) => {
                const track = tracks.find(t => t.id === trackId);
                if (!track) return null;
                return (
                  <SortableRow
                    key={`${trackId}-${pos}`}
                    id={trackId}
                    dndId={`q-${pos}`}
                    title={track.title}
                    artist={track.artist || track.name}
                    coverUrl={track.coverUrl ?? ''}
                    duration={track.duration}
                    isCurrent={trackId === currentId}
                    pos={pos}
                    onRemove={handleRemove}
                    onPlay={handlePlay}
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

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/components/player/QueueSidebar.tsx
git commit -m "feat: QueueSidebar — amber active track, CLAUDE.md design"
```

---

## Task 7: TrackLibrary.tsx

**Files:**
- Modify: `app/components/player/TrackLibrary.tsx`

- [ ] **Step 1: Replace file entirely**

```tsx
'use client';

import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Play, X, Search } from 'lucide-react';
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

      {/* Search */}
      <div className="px-3 py-2">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md"
          style={{ background: 'var(--s2)', border: '1px solid var(--br)' }}
        >
          <Search size={11} style={{ color: 'var(--t3)', flexShrink: 0 }} />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tracks..."
            className="flex-1 bg-transparent focus:outline-none"
            style={{
              color: 'var(--t1)',
              fontSize: 11,
              fontWeight: 500,
              caretColor: 'var(--a)',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="shrink-0 transition-colors"
              style={{ color: 'var(--t3)' }}
              onMouseEnter={e => { (e.currentTarget).style.color = 'var(--t2)'; }}
              onMouseLeave={e => { (e.currentTarget).style.color = 'var(--t3)'; }}
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Count */}
      <div className="px-3 pb-1">
        <span style={{ color: 'var(--t3)', fontSize: 9, fontWeight: 500 }}>
          {query ? `${filtered.length} of ${tracks.length} tracks` : `${tracks.length} tracks`}
        </span>
      </div>

      {/* Track list */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(vItem => {
            const track = filtered[vItem.index];
            const isCurrent = track.id === currentId;

            return (
              <div
                key={track.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${vItem.start}px)`,
                  width: '100%',
                  height: vItem.size,
                  borderLeft: isCurrent ? '2px solid var(--a)' : '2px solid transparent',
                  background: isCurrent ? '#f59e0b08' : undefined,
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
                className="flex items-center gap-2 px-3 cursor-pointer transition-colors"
                onMouseEnter={e => {
                  if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = 'var(--s3)';
                }}
                onMouseLeave={e => {
                  if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = '';
                }}
              >
                {/* Playing indicator */}
                <div className="w-4 shrink-0 flex items-center justify-center">
                  {isCurrent && playing ? (
                    <span className="flex gap-px items-end h-3.5">
                      {[1, 2, 3].map(i => (
                        <span
                          key={i}
                          className="w-px rounded-full animate-bounce"
                          style={{
                            height: `${50 + i * 15}%`,
                            animationDelay: `${i * 100}ms`,
                            background: 'var(--green)',
                          }}
                        />
                      ))}
                    </span>
                  ) : isCurrent ? (
                    <Play size={9} style={{ color: 'var(--a)', fill: 'var(--a)' }} />
                  ) : null}
                </div>

                {/* Title + artist */}
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate leading-tight"
                    style={{ color: isCurrent ? 'var(--a)' : 'var(--t1)', fontSize: 11.5, fontWeight: 600 }}
                  >
                    {track.title}
                  </p>
                  <p className="truncate" style={{ color: 'var(--t2)', fontSize: 9.5, fontWeight: 500 }}>
                    {track.artist || track.name}
                  </p>
                </div>

                {/* Duration */}
                {track.duration > 0 && (
                  <span className="shrink-0" style={{ color: 'var(--t2)', fontSize: 9, fontWeight: 400 }}>
                    {formatTime(track.duration)}
                  </span>
                )}

                {/* Error badge */}
                {track.error && (
                  <span
                    className="px-1 rounded shrink-0"
                    style={{ color: 'var(--orange)', border: '1px solid var(--orange)', fontSize: 9, fontWeight: 700, opacity: 0.8 }}
                  >
                    ERR
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Context menu */}
      {menu.visible && (
        <div
          className="fixed z-50 py-1 shadow-xl rounded-lg overflow-hidden"
          style={{
            left: menu.x,
            top: menu.y,
            background: 'var(--s2)',
            border: '1px solid var(--br)',
          }}
        >
          {[
            { label: 'Play now',     action: () => { playNow(menu.trackId);    closeMenu(); } },
            { label: 'Play next',    action: () => { playNext(menu.trackId);   closeMenu(); } },
            { label: 'Add to queue', action: () => { addToQueue(menu.trackId); closeMenu(); } },
          ].map(({ label, action }) => (
            <button
              key={label}
              className="block w-full px-4 py-2.5 text-left transition-colors whitespace-nowrap touch-manipulation"
              style={{ color: 'var(--t2)', fontSize: 11, fontWeight: 600 }}
              onPointerDown={e => { e.stopPropagation(); action(); }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--t1)'; (e.target as HTMLElement).style.background = 'var(--s3)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--t2)'; (e.target as HTMLElement).style.background = ''; }}
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

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/components/player/TrackLibrary.tsx
git commit -m "feat: TrackLibrary — amber active track, clean search, CLAUDE.md design"
```

---

## Task 8: NowPlayingStage.tsx

**Files:**
- Modify: `app/components/player/NowPlayingStage.tsx`

- [ ] **Step 1: Replace file entirely**

```tsx
'use client';

import { useMemo, useCallback } from 'react';
import { Music } from 'lucide-react';
import { usePlayer, formatTime } from '../../lib/playerContext';
import { EQPanel } from '../eq/EQPanel';

const FORMAT_MAP: Record<string, string> = {
  'audio/mpeg': 'MP3', 'audio/flac': 'FLAC', 'audio/wav': 'WAV',
  'audio/aac': 'AAC', 'audio/mp4': 'M4A', 'audio/webm': 'WEBM',
  'video/webm': 'WEBM', 'audio/ogg': 'OGG', 'audio/opus': 'OPUS',
  'audio/x-aiff': 'AIFF',
};
function fmtLabel(type: string) {
  return FORMAT_MAP[type] ?? type.split('/')[1]?.toUpperCase() ?? '?';
}
function fmtBytes(bytes: number) {
  return (bytes / 1_000_000).toFixed(1) + ' MB';
}

interface Props {
  libOpen: boolean;
  queueOpen: boolean;
}

function ArtBox({ coverUrl, playing }: { coverUrl?: string; playing: boolean }) {
  return (
    <div
      className="relative shrink-0 w-52 h-52 overflow-hidden"
      style={{ border: '1px solid var(--br)', borderRadius: 12, background: 'var(--s2)' }}
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Music size={48} style={{ color: 'var(--t3)' }} />
        </div>
      )}
      {/* Playing dot */}
      {playing && (
        <div
          className="absolute top-3 right-3 w-2 h-2 rounded-full"
          style={{ background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }}
        />
      )}
    </div>
  );
}

function StandbyBlock({ centered }: { centered?: boolean }) {
  return (
    <div
      className={`flex flex-col select-none ${centered ? 'items-center text-center gap-4 py-10 px-10' : 'gap-4 py-10 px-8'}`}
    >
      <div className="w-16 h-16 flex items-center justify-center rounded-xl" style={{ background: 'var(--s2)', border: '1px solid var(--br)' }}>
        <Music size={28} style={{ color: 'var(--t3)' }} />
      </div>
      <div>
        <p style={{ color: 'var(--t2)', fontSize: 14, fontWeight: 600 }}>
          No track loaded
        </p>
        <p className="mt-1" style={{ color: 'var(--t3)', fontSize: 12, fontWeight: 500 }}>
          {centered ? 'Drop files or open the library to get started' : 'Drop files or\nopen the library'}
        </p>
      </div>
    </div>
  );
}

export function NowPlayingStage({ libOpen, queueOpen }: Props) {
  const { state, setEQBandGain, setEQBypass } = usePlayer();
  const { tracks, queue, queuePos, playing } = state;
  const currentId = queue[queuePos] ?? null;
  const track = useMemo(
    () => (currentId ? tracks.find(t => t.id === currentId) ?? null : null),
    [currentId, tracks]
  );
  const noop = useCallback(() => {}, []);

  return (
    <div
      className="absolute inset-0 transition-all duration-200"
      style={{
        paddingLeft: libOpen ? '15rem' : 0,
        paddingRight: queueOpen ? '18rem' : 0,
      }}
    >
      {/* ── Desktop: [art + info] | [EQ panel] ── */}
      <div className="hidden sm:flex h-full">

        {/* Left column: art + track info */}
        <div className="flex flex-col justify-center gap-5 px-8 py-8 w-72 shrink-0 select-none overflow-hidden">
          {track ? (
            <>
              <ArtBox coverUrl={track.coverUrl} playing={playing} />
              <div className="min-w-0 w-full overflow-hidden">
                <p
                  className="line-clamp-2 leading-snug"
                  style={{ color: 'var(--t1)', fontSize: 22, fontWeight: 800 }}
                >
                  {track.title}
                </p>
                {track.artist && (
                  <p className="mt-1 truncate" style={{ color: 'var(--t2)', fontSize: 13, fontWeight: 500 }}>
                    {track.artist}
                  </p>
                )}
                {track.album && (
                  <p className="mt-0.5 truncate" style={{ color: 'var(--t3)', fontSize: 11, fontWeight: 400 }}>
                    {track.album}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <span
                    className="px-2 py-0.5 rounded"
                    style={{ color: 'var(--a)', border: '1px solid #f59e0b45', background: '#f59e0b18', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}
                  >
                    {fmtLabel(track.type)}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded"
                    style={{ color: 'var(--t2)', border: '1px solid var(--br)', background: 'var(--s2)', fontSize: 9, fontWeight: 500 }}
                  >
                    {fmtBytes(track.size)}
                  </span>
                  {track.duration > 0 && (
                    <span
                      className="px-2 py-0.5 rounded"
                      style={{ color: 'var(--t2)', border: '1px solid var(--br)', background: 'var(--s2)', fontSize: 9, fontWeight: 500 }}
                    >
                      {formatTime(track.duration)}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <StandbyBlock />
          )}
        </div>

        {/* Right column: EQ — always visible on desktop */}
        <div
          className="flex-1 flex flex-col min-w-0"
          style={{ borderLeft: '1px solid var(--br)' }}
        >
          <EQPanel
            open={true}
            onClose={noop}
            setEQBandGain={setEQBandGain}
            setEQBypass={setEQBypass}
            embedded
          />
        </div>
      </div>

      {/* ── Mobile ── */}
      <div className="sm:hidden h-full flex flex-col" style={{ pointerEvents: 'none' }}>
        {track ? (
          <div
            className="flex flex-col items-center justify-center gap-5 px-6 py-8 h-full select-none"
            style={{ pointerEvents: 'auto' }}
          >
            <ArtBox coverUrl={track.coverUrl} playing={playing} />
            <div className="text-center w-full min-w-0 max-w-xs">
              <p className="line-clamp-2 leading-snug" style={{ color: 'var(--t1)', fontSize: 22, fontWeight: 800 }}>
                {track.title}
              </p>
              {track.artist && (
                <p className="mt-1 truncate" style={{ color: 'var(--t2)', fontSize: 13, fontWeight: 500 }}>
                  {track.artist}
                </p>
              )}
              {track.album && (
                <p className="mt-0.5 truncate" style={{ color: 'var(--t3)', fontSize: 11, fontWeight: 400 }}>
                  {track.album}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap justify-center mt-3">
                <span
                  className="px-2 py-0.5 rounded"
                  style={{ color: 'var(--a)', border: '1px solid #f59e0b45', background: '#f59e0b18', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}
                >
                  {fmtLabel(track.type)}
                </span>
                <span
                  className="px-2 py-0.5 rounded"
                  style={{ color: 'var(--t2)', border: '1px solid var(--br)', background: 'var(--s2)', fontSize: 9, fontWeight: 500 }}
                >
                  {fmtBytes(track.size)}
                </span>
                {track.duration > 0 && (
                  <span
                    className="px-2 py-0.5 rounded"
                    style={{ color: 'var(--t2)', border: '1px solid var(--br)', background: 'var(--s2)', fontSize: 9, fontWeight: 500 }}
                  >
                    {formatTime(track.duration)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ pointerEvents: 'auto' }}>
            <StandbyBlock centered />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/components/player/NowPlayingStage.tsx
git commit -m "feat: NowPlayingStage — clean minimal layout, amber chips, CLAUDE.md design"
```

---

## Task 9: EQCurve.tsx — Amber Curve

**Files:**
- Modify: `app/components/eq/EQCurve.tsx`

- [ ] **Step 1: Locate and replace all color references**

In `app/components/eq/EQCurve.tsx`, replace every `--nx-*` color reference:

| Old | New |
|-----|-----|
| `var(--nx-cyan)` | `var(--a)` |
| `rgba(0,212,255,...)` | `rgba(245,158,11,...)` with matching opacity |
| `var(--nx-red)` | `var(--a)` (gain color — both positive and negative use amber; rely on position, not color) |
| `var(--nx-border)` → grid lines | `var(--br)` |
| `var(--nx-bg-raised)` → dot background | `var(--s2)` |
| `var(--nx-text-dim)` → freq labels | `var(--t3)` |

- [ ] **Step 2: Run tests to verify math is intact**

```bash
npx vitest run __tests__/EQCurve.test.tsx
```

Expected: all 14 cases pass.

- [ ] **Step 3: Commit**

```bash
git add app/components/eq/EQCurve.tsx
git commit -m "feat: EQCurve — amber curve and dots, CLAUDE.md design"
```

---

## Task 10: EQPanel.tsx — Amber Presets and Bypass

**Files:**
- Modify: `app/components/eq/EQPanel.tsx`

- [ ] **Step 1: Replace all color references in EQPanel.tsx**

In `app/components/eq/EQPanel.tsx`, replace every `--nx-*` color reference:

| Old | New |
|-----|-----|
| `var(--nx-cyan)` | `var(--a)` |
| `var(--nx-red)` | `var(--a)` (band sliders — both positive/negative use amber) |
| `rgba(0,212,255,...)` → active preset bg | `#f59e0b18` |
| `rgba(0,212,255,...) border` → active preset border | `#f59e0b45` |
| `var(--nx-bg-panel)` | `var(--s1)` |
| `var(--nx-bg-raised)` | `var(--s2)` |
| `var(--nx-border)` | `var(--br)` |
| `var(--nx-border-active)` | `#f59e0b45` |
| `var(--nx-text)` | `var(--t1)` |
| `var(--nx-text-dim)` | `var(--t2)` |
| `var(--nx-cyan-dim)` | `var(--t3)` |

Also update the header label: remove "EQUALIZER" / any uppercase monospace label. Replace with `style={{ color: 'var(--t1)', fontSize: 14, fontWeight: 800 }}` reading "EQ".

- [ ] **Step 2: Run EQ tests**

```bash
npx vitest run __tests__/EQPanel.test.tsx __tests__/eqReducer.test.ts __tests__/playerContext.eq.test.ts
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add app/components/eq/EQPanel.tsx
git commit -m "feat: EQPanel — amber preset chips and bypass, CLAUDE.md design"
```

---

## Task 11: PlayerBar.tsx — Amber Transport

**Files:**
- Modify: `app/components/player/PlayerBar.tsx`

- [ ] **Step 1: Replace the `NxBtn` component**

Replace the `NxBtn` component (lines ~30-56) with an amber-based version:

```tsx
function ABtn({ onClick, title, active, children, disabled }: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="flex items-center justify-center w-11 h-11 rounded-lg transition-colors shrink-0 disabled:opacity-20"
      style={{
        color: active ? 'var(--a)' : 'var(--t2)',
        background: active ? '#f59e0b18' : 'transparent',
        border: active ? '1px solid #f59e0b45' : '1px solid transparent',
      }}
    >
      {children}
    </button>
  );
}
```

Also rename every usage of `<NxBtn` to `<ABtn` throughout the file.

- [ ] **Step 2: Replace the outer container style**

Replace line:
```tsx
<div className="pb-safe" style={{ background: 'var(--nx-bg-panel)', borderTop: '1px solid var(--nx-cyan)' }}>
```
With:
```tsx
<div className="pb-safe" style={{ background: 'var(--s1)', borderTop: '1px solid var(--br)' }}>
```

- [ ] **Step 3: Replace seek bar colors**

In the seek bar section, replace:
- Track bg: `rgba(0,212,255,0.1)` → `var(--s5)`
- Tick marks: `rgba(0,212,255,0.18)` → `rgba(255,255,255,0.05)`
- A-B region fill: `rgba(0,212,255,0.2)` → `rgba(245,158,11,0.15)`
- Fill bar: `var(--nx-cyan)` → `var(--a)`
- Loop markers: `var(--nx-cyan)` → `var(--a)`
- Diamond thumb: `var(--nx-red)` → `var(--a)`; change from `rotate-45` diamond to a round `rounded-full w-2.5 h-2.5`

Context menu panel:
- `var(--nx-bg-panel)` → `var(--s2)`
- `var(--nx-border-active)` → `var(--br)`
- Label text `var(--nx-text-dim)` → `var(--t2)`
- Hover color `var(--nx-cyan)` → `var(--a)`
- Change labels: `'SET LOOP START (A)'` → `'Set loop start (A)'`, `'SET LOOP END (B)'` → `'Set loop end (B)'`

- [ ] **Step 4: Replace album art and track info section**

Replace the track info section (the button containing album art, SYS-ID label, title, artist):

```tsx
<button
  onClick={track ? onOpenNowPlaying : undefined}
  disabled={!track}
  className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none sm:w-44 text-left disabled:cursor-default"
>
  <div
    className="w-10 h-10 shrink-0 flex items-center justify-center overflow-hidden rounded-md"
    style={{ border: '1px solid var(--br)', background: 'var(--s2)' }}
  >
    {track?.coverUrl
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={track.coverUrl} alt="cover" className="w-full h-full object-cover" />
      : <Music size={14} style={{ color: 'var(--t3)' }} />
    }
  </div>
  <div className="flex-1 min-w-0">
    {track ? (
      <>
        <p className="truncate leading-tight" style={{ color: 'var(--t1)', fontSize: 11.5, fontWeight: 600 }}>
          {track.title}
        </p>
        <p className="truncate" style={{ color: 'var(--t2)', fontSize: 9.5, fontWeight: 500 }}>
          {track.artist || track.name}
        </p>
      </>
    ) : (
      <p style={{ color: 'var(--t3)', fontSize: 11, fontWeight: 500 }}>No track</p>
    )}
  </div>
</button>
```

Remove the `sysIdRef` ref and the `useEffect` that handles the `animate-nx-flicker` class (the SYS-ID flicker effect is gone).

- [ ] **Step 5: Replace play button**

Replace the clip-path play button with a clean round amber button:

```tsx
<button
  onClick={togglePlay}
  disabled={!track}
  className="flex items-center justify-center w-10 h-10 mx-1 rounded-full transition-all disabled:opacity-20"
  style={{
    background: playing ? 'var(--a)' : 'transparent',
    border: '1px solid #f59e0b45',
    color: playing ? '#000' : 'var(--a)',
    boxShadow: '0 0 12px #F59E0B55',
  }}
>
  {playing ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
</button>
```

- [ ] **Step 6: Replace transport prev/next button styles**

The plain `<button>` prev/next buttons (not NxBtn) — replace inline `onMouseEnter`/`onMouseLeave` `var(--nx-cyan)` with `var(--a)`:

```tsx
onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--a)'; }}
onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t2)'; }}
```

Also change default `color: 'var(--nx-text-dim)'` → `color: 'var(--t2)'`.

- [ ] **Step 7: Replace secondary controls colors**

- Time display: `var(--nx-cyan)` → `var(--t2)`
- Mute button: `var(--nx-text-dim)` → `var(--t2)`
- Volume track bg: `rgba(0,212,255,0.15)` → `var(--s5)`
- Volume fill: `var(--nx-cyan)` → `var(--a)`
- Volume thumb: `var(--nx-cyan)` → `var(--a)` (round, not diamond)
- Speed button active color: `var(--nx-cyan)` → `var(--a)`, inactive: `var(--nx-text-dim)` → `var(--t2)`
- `?` shortcuts button: `var(--nx-text-dim)` → `var(--t2)`
- A-B section border: `var(--nx-border)` → `var(--br)`
- A/B button active: `var(--nx-cyan)` → `var(--a)`, active bg: `rgba(0,212,255,0.08)` → `#f59e0b18`

- [ ] **Step 8: Remove the sysIdRef import and variable declaration**

Remove `const sysIdRef = useRef<HTMLSpanElement>(null)` and the `useEffect` that watches `currentId` and toggles `animate-nx-flicker`. Remove `sysIdRef` from the JSX ref prop.

- [ ] **Step 9: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add app/components/player/PlayerBar.tsx
git commit -m "feat: PlayerBar — amber transport, round play button, CLAUDE.md design"
```

---

## Task 12: PlayerShell.tsx — 3-Column Layout

**Files:**
- Modify: `app/components/player/PlayerShell.tsx`

- [ ] **Step 1: Replace file entirely**

```tsx
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
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors (TacticalBrackets fully removed, all nx-* vars gone).

- [ ] **Step 4: Commit**

```bash
git add app/components/player/PlayerShell.tsx
git commit -m "feat: PlayerShell — 3-col layout, 240px sidebar, CLAUDE.md design"
```

---

## Task 13: Merge Worktrees to Master

**Goal:** Merge `feature/feature8-dsp` and `feature/partial-tasks-completion` into `master`, then merge `dev` (now containing the full UI redesign) into `master`.

**Pre-condition:** All previous tasks complete, all tests pass on `dev`.

- [ ] **Step 1: Confirm clean state on dev**

```bash
git status
npx vitest run
```

Expected: clean working tree, all tests pass.

- [ ] **Step 2: Merge feature/partial-tasks-completion into master**

```bash
git checkout master
git merge feature/partial-tasks-completion --no-ff -m "feat: merge partial-tasks-completion — NowPlayingPanel, KeyboardShortcutsOverlay, queue callbacks"
```

- [ ] **Step 3: Merge feature/feature8-dsp into master**

```bash
git merge feature/feature8-dsp --no-ff -m "feat: merge Feature 8 — Full DSP Signal Chain"
```

If conflicts arise, resolve in favor of the `feature/feature8-dsp` version for DSP files (`DSPPanel.tsx` etc.) and `dev` version for files that exist on both.

- [ ] **Step 4: Merge dev (UI redesign) into master**

```bash
git merge dev --no-ff -m "feat: merge dev — CLAUDE.md UI redesign (Syne, amber, clean layout)"
```

Resolve any conflicts in favor of `dev` for all UI files already redesigned in Tasks 1–12.

- [ ] **Step 5: Run tests on master**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: TypeScript check on master**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Update PROGRESS.md on master**

Add to PROGRESS.md:
- UI Redesign section: NEXUS-7 → CLAUDE.md complete
- Feature 8 merged to master
- partial-tasks-completion merged to master

```bash
git add PROGRESS.md
git commit -m "docs: PROGRESS.md — UI redesign complete, Feature 8 merged to master"
```

- [ ] **Step 8: Push master**

```bash
git push origin master
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ globals.css tokens replaced (Task 1)
- ✅ Syne font (Task 1)
- ✅ TacticalBrackets deleted (Task 2)
- ✅ FileDropZone amber (Task 3)
- ✅ KeyboardShortcutsOverlay amber keys (Task 4)
- ✅ NowPlayingPanel amber + clean (Task 5)
- ✅ QueueSidebar amber active (Task 6)
- ✅ TrackLibrary amber left border + clean search (Task 7)
- ✅ NowPlayingStage clean minimal + amber chips (Task 8)
- ✅ EQCurve amber (Task 9)
- ✅ EQPanel amber presets + bypass (Task 10)
- ✅ PlayerBar amber transport + round play button glow (Task 11)
- ✅ PlayerShell 3-col 240px sidebar (Task 12)
- ✅ Glow only on play button (Task 11 step 5)
- ✅ No gradients except NowPlayingPanel color-thief (Tasks 5, 8)
- ✅ Worktree merges to master (Task 13)

**Placeholder scan:** None found.

**Type consistency:** `ABtn` introduced in Task 11 and used only in Task 11. All other types unchanged.
