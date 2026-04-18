# LocalTune

[![GitHub](https://img.shields.io/github/stars/Bhavye2003Developer/localTune?style=social)](https://github.com/Bhavye2003Developer/localTune)

A local-first browser media player. No accounts, no uploads, no servers. Your files never leave your device.

Built on Web APIs - IndexedDB for storage, Web Audio API for the signal chain, HTMLAudioElement for playback. The entire app runs in the browser.

## Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## What it does

Drop audio files (or folders) into the app. They get indexed, persisted to IndexedDB, and are available the next time you open the browser. Everything plays offline.

**Playback** - play/pause, seek, next/prev, queue management, shuffle, loop modes (off / track / queue), variable speed (0.25x to 4x), gapless playback with crossfade.

**A-B loop** - set A and B markers on any track to loop a region. Markers are saved per track and restored when you come back.

**10-band EQ** - parametric equalizer with a live frequency response curve, draggable band dots, built-in presets, and custom preset save/load.

**DSP chain** - ReplayGain, bass engine, compressor, stereo widener, convolution reverb, brickwall limiter. Drag to reorder.

**Queue** - add tracks, reorder by dragging, remove individually or clear all. Auto-advances on track end.

**Sleep timer** - set a countdown (15 / 30 / 45 / 60 min) from the moon icon in the player bar. Playback pauses automatically when time is up.

## Stack

Next.js 16, React 19, TypeScript 5 (strict), Tailwind CSS 4, Dexie (IndexedDB), Web Audio API, Framer Motion.

## Tech notes

One `AudioContext` per session, created on first user gesture. Audio nodes are built once and never torn down - bypasses go through `GainNode` gain rather than disconnect/reconnect, which avoids click artifacts. The seek bar and progress display run on `requestAnimationFrame`, not `timeupdate`.

Files are stored as blobs in IndexedDB up to a 150 MB cap. On next session open, blob URLs are recreated from the stored data and ID3 tags are re-read for cover art.

Built with [Claude Code](https://claude.ai/code).
