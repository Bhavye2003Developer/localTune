# NEXUS-7 Tactical Interface — UI Revamp Design Spec
**Date:** 2026-04-05  
**Status:** Approved

---

## Overview

Full visual overhaul of the FineTune music player to a military-grade cybergenetic aesthetic. The design merges **Option A (Tactical Ops)** and **Option C (Ghost Protocol)**: tactical terminology and corner-bracket decoration from A, angular clip-paths and austere precision from C.

---

## Color System

| Token | Value | Usage |
|-------|-------|-------|
| `bg-deep` | `#000a0e` | Root background |
| `bg-panel` | `#020f14` | Panel surfaces (library, bars) |
| `bg-raised` | `#041520` | Raised elements, active rows |
| `cyan-primary` | `#00d4ff` | All active / operational states |
| `cyan-dim` | `#004d5c` | Borders, inactive indicators |
| `red-threat` | `#ff003c` | Hover accents, errors, drag states |
| `text-primary` | `#c8e8f0` | Track titles, main content |
| `text-dim` | `#3d6070` | Labels, metadata, secondary |
| `border-default` | `rgba(0,212,255,0.12)` | Resting panel borders |
| `border-active` | `rgba(0,212,255,0.6)` | Focused / active panel borders |

---

## Typography

| Use | Style |
|-----|-------|
| Section headers | `font-mono uppercase tracking-widest text-[9px]` in `#004d5c` |
| Track titles | Clean sans `text-sm` in `#c8e8f0` |
| Artist / album | `font-mono text-[11px]` in `#3d6070` |
| Time / data readouts | `font-mono tabular-nums` in `#00d4ff` |
| Button labels / key hints | `font-mono text-[10px] uppercase` |
| Track index (T-001) | `font-mono text-[10px]` in `#004d5c` |

---

## Global CSS (`app/globals.css`)

### CSS Variables
Define all color tokens as CSS custom properties on `:root`.

### Dot-grid background
Applied to the root `<main>` element:
```css
background-image: radial-gradient(circle, rgba(0,212,255,0.06) 1px, transparent 1px);
background-size: 24px 24px;
```

### Corner bracket utility (`.bracket`)
Pure CSS decoration — 2px cyan lines, 16px arms, applied to panel containers via `::before` / `::after` pseudo-elements on child divs. Scales to 8px arms on mobile (`< 640px`).

### Clip-path panel shape
All floating overlay panels (Queue, Now Playing, Shortcuts) use:
```css
clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
```

### Animations
```css
@keyframes scanline   — single horizontal line sweeps panel top-to-bottom, opacity 0.03, 8s loop
@keyframes blink      — 0%/49% opacity 1, 50%/100% opacity 0, 1.2s loop (status dots)
@keyframes glow-pulse — box-shadow cycles 4px→12px cyan glow, 2s loop (focused elements)
@keyframes flicker    — opacity 0.3→1 over 80ms, plays once on track change (SYS-ID line)
```

### Scrollbar
```css
::-webkit-scrollbar       { width: 2px }
::-webkit-scrollbar-track { background: transparent }
::-webkit-scrollbar-thumb { background: rgba(0,212,255,0.3) }
```

---

## Component Specifications

### PlayerShell
- Root `<main>`: `bg-[#000a0e]` + dot-grid background CSS class
- Main content area (`flex-1`): no change to layout structure
- Library panel: retains `absolute left-0` positioning, gets new styling

---

### Library Panel → `INTEL DATABASE`

**Header:**
- `◈ INTEL DATABASE` in `font-mono uppercase tracking-widest text-[9px]` cyan-dim
- Right-aligned: `[NNN]` track count in same style

**Search input:**
- No border-radius
- Bottom-border only: `border-b border-[rgba(0,212,255,0.3)]`
- Prefix label: `QUERY ›` in dim mono, inside input container
- Cyan caret: `caret-[#00d4ff]`
- Text: `#c8e8f0`, placeholder: `#3d6070`

**Track rows:**
- Left: `T-001` index in `font-mono text-[10px] text-[#004d5c]` (3-digit, zero-padded)
- Middle: title in `text-sm text-[#c8e8f0]` + artist in `font-mono text-[11px] text-[#3d6070]`
- Right: duration in `font-mono text-[11px] text-[#00d4ff]`
- Status dot: `●` 6px, cyan when loaded, red if error, blinking animation on active track
- **Hover:** `border-l-2 border-[#ff003c]` + `bg-[#06101a]`
- **Active:** `border-l-2 border-[#00d4ff]` + `bg-[#041520]`
- No border-radius on rows

**Panel border:**
- `border-r border-[rgba(0,212,255,0.12)]`
- Panel background: `bg-[#020f14]`

---

### FileDropZone

**Default state:**
- No filled background — corner brackets only (`.bracket` class)
- Center text: `DROP AUDIO FILES` + `OR CLICK TO SELECT` in dim mono
- `+ LOAD FILES` button: monospace, 1px cyan border, no radius, clip-path diagonal

**Drag-over state:**
- Corner brackets turn `#ff003c`
- Text changes to `RECEIVING PAYLOAD`
- Subtle red border glow: `box-shadow: 0 0 16px rgba(255,0,60,0.2)`

**No files loaded (shown in library area):**
- `NO FILES LOADED` header in dim mono
- `AWAITING INPUT` sub-label with blinking cursor `_`

---

### PlayerBar → `COMMAND CONSOLE`

**Container:**
- `bg-[#020f14]` + `border-t border-[#00d4ff]` (1px, full opacity top border — the "console header line")
- `pb-safe` for iOS safe area

**Progress bar:**
- Full-width, `h-[3px]` resting, `h-[4px]` on hover
- Track: `bg-[rgba(0,212,255,0.1)]`
- Fill: `bg-[#00d4ff]`
- Tick marks: 9 vertical lines at 10% intervals, `h-[6px] w-[1px] bg-[rgba(0,212,255,0.2)]`, positioned absolutely
- Drag thumb: `w-3 h-3` red `bg-[#ff003c]` diamond (rotate-45) — appears on hover/drag
- A/B loop region: `bg-[rgba(0,212,255,0.15)]`

**Left section (track info):**
- Top micro-label: `SYS-ID` in `font-mono text-[8px] tracking-widest text-[#004d5c]` — has `flicker` animation class applied on track change
- Track title: `text-sm text-[#c8e8f0]`
- Artist: `font-mono text-[11px] text-[#3d6070]`
- Album art thumbnail: sharp corners, 1px `border-[rgba(0,212,255,0.2)]`

**Transport controls:**
- Prev/Next: `text-[#3d6070]` → `text-[#00d4ff]` on hover, icon size 18
- Play/Pause button: `w-10 h-10`, clip-path diagonal cut top-right `polygon(0 0, calc(100%-8px) 0, 100% 8px, 100% 100%, 0 100%)`, `border border-[rgba(0,212,255,0.4)]`, fills `bg-[#00d4ff]` when playing with icon in `#000a0e`
- `glow-pulse` animation on play button when playing

**Right controls:**
- Time: `font-mono text-[11px] text-[#00d4ff]` — `04:21 / 07:03`
- All icon buttons: `text-[#3d6070]` → `text-[#00d4ff]` hover, no border-radius
- Active state: `text-[#00d4ff] bg-[rgba(0,212,255,0.08)]`
- EQ button active: `text-[#ff003c] bg-[rgba(255,0,60,0.08)]` (threat color — you're modifying the signal)
- Speed readout: `font-mono text-[11px]`
- Keyboard hint tooltips: `font-mono text-[9px]`

---

### EQ Panel → `SIGNAL PROCESSOR`

**Header:**
- `◈ SIGNAL PROCESSOR` left in mono cyan-dim
- `[×]` close button right in red
- `[ BYPASS ]` toggle: `font-mono text-[10px]`, active state has red text + red border

**SVG curve:**
- Stroke: `#00d4ff`, strokeWidth 1.5
- Fill area: `rgba(0,212,255,0.06)`

**Band drag dots → crosshairs:**
- Replace circle with `+` crosshair (two 8px lines, 1px wide)
- Color: `#00d4ff` resting, `#ff003c` on grab
- Expands slightly on grab

**Preset chips:**
- `[FLAT]` `[BASS+]` etc. — `font-mono text-[9px] uppercase`, 1px `border-[rgba(0,212,255,0.3)]`, no border-radius
- Active preset: `border-[#00d4ff] text-[#00d4ff] bg-[rgba(0,212,255,0.08)]`

**Panel:**
- `bg-[#020f14] border-t border-[rgba(0,212,255,0.2)]`

---

### QueueSidebar → `MISSION QUEUE`

**Header:** `◈ MISSION QUEUE` + `[×]` close  
**Panel:** clip-path diagonal, `bg-[#020f14]`, `border-l border-[rgba(0,212,255,0.15)]`  
**Track items:**
- `[01]` `[02]` index prefix in dim mono
- Playing item: `border-l-2 border-[#00d4ff]` + status dot blinking
- Drag handles: `⋮⋮` in dim mono

---

### NowPlayingPanel → `NOW BROADCASTING`

**Overlay:** `bg-[rgba(0,10,14,0.85)] backdrop-blur-sm`  
**Panel:** clip-path diagonal top-right, `bg-[#020f14]`, `border border-[rgba(0,212,255,0.2)]`, corner brackets  
**Header:** `◈ NOW BROADCASTING` in mono  
**Cover art:** sharp corners, 1px cyan border, color-thief gradient behind  
**Metadata:** title in `text-primary`, artist/album in mono dim  
**Badges:** `[MP3]` `[4.2 MB]` `[3:45]` — monospace, 1px border, no radius

---

### KeyboardShortcutsOverlay → `COMMAND REFERENCE`

**Header:** `◈ COMMAND REFERENCE`  
**Layout:** two-column table — description left (text-dim), key right (`font-mono bg-[#041520] border border-[rgba(0,212,255,0.2)] px-1.5`)  
**Panel:** clip-path, corner brackets, dark bg

---

## Mobile Adaptations

- Corner bracket arms: 8px (vs 16px desktop)
- Scanline animation: disabled
- Dot-grid: opacity halved
- All touch targets: ≥ 44px maintained
- Clip-paths: retained (CSS-only, no performance cost)

---

## Files to Modify

| File | Change |
|------|--------|
| `app/globals.css` | CSS variables, dot-grid, `.bracket`, animations, scrollbar, clip-path utility |
| `app/components/player/PlayerShell.tsx` | Root bg + dot-grid class |
| `app/components/player/PlayerBar.tsx` | Full restyle — console header, progress ticks, transport, controls |
| `app/components/player/TrackLibrary.tsx` | Intel database styling, row redesign |
| `app/components/player/FileDropZone.tsx` | Corner bracket, tactical copy, drag state |
| `app/components/player/QueueSidebar.tsx` | Mission queue header, clip-path, row numbering |
| `app/components/player/NowPlayingPanel.tsx` | Now broadcasting, clip-path, corner brackets |
| `app/components/eq/EQPanel.tsx` | Signal processor header, crosshair dots, bypass toggle, preset chips |
| `app/components/player/KeyboardShortcutsOverlay.tsx` | Command reference, table layout |
