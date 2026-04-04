# FineTune — V1 Feature Specification
## Built with Next.js 15 · Zero Browser Discrepancy · Every Feature Works Everywhere

> **V1 Philosophy:** No banners. No "use Chrome for best experience." No two-tier users.
> Every feature listed here works identically on Chrome, Firefox, Safari, Edge, Android Chrome, and iOS Safari.
> The magic happens after files are loaded — and that magic is universal.

---

## Framework & Base Stack

| Package | Purpose | Install |
|---|---|---|
| Next.js 15 | Framework with App Router | `npx create-next-app@latest` |
| TypeScript | Type safety across entire codebase | Included with Next.js |
| Tailwind CSS | Styling | `npm install tailwindcss` |
| Framer Motion | Animations and transitions | `npm install framer-motion` |
| Dexie.js | IndexedDB wrapper for session storage | `npm install dexie` |
| Lucide React | Icons | `npm install lucide-react` |
| Sonner | Toast notifications | `npm install sonner` |
| next-pwa | PWA and Service Worker setup | `npm install next-pwa` |

---

## Entry Point — Universal File Loading

**What it does:**
User picks audio or video files via a file picker button or drags them directly onto the app. No folder picker. No Chrome-only APIs. Works on every browser and every device including mobile. Once files are loaded, the full FineTune experience begins.

**How it works:**
- File picker button uses the standard HTML file input with `multiple` and `accept="audio/*,video/*"` attributes
- Drag and drop zone accepts files and folders dropped from the OS file manager using `DataTransferItem.webkitGetAsEntry()` — universally supported
- On mobile, tapping the button opens the native Files app — user picks individual files
- All loaded files are immediately indexed into Dexie for the session
- BPM, key, and mood analysis begins in the background the moment files are loaded

**Browser support:** ✅ Chrome · ✅ Firefox · ✅ Safari · ✅ Edge · ✅ Android Chrome · ✅ iOS Safari

| Package | Purpose | Install |
|---|---|---|
| Dexie.js | Store loaded file metadata and analysis results for the session | `npm install dexie` |
| @tanstack/react-virtual | Virtualize the library list — handles 10,000+ tracks without jank | `npm install @tanstack/react-virtual` |
| @dnd-kit/core + @dnd-kit/sortable | Drag to reorder queue | `npm install @dnd-kit/core @dnd-kit/sortable` |

---

## Core — Playback Engine

**This is the product. Everything else is built on top of this. Build this first and make it bulletproof before touching any other feature.**

---

### Step 1 — File Loading Flow

The complete journey from a user selecting a file to audio coming out of the speakers.

**Stage 1 — File Selection**
User clicks the "Open Files" button or drags files onto the drop zone. The file input accepts `audio/*` and `video/*`. Multiple files can be selected at once. Each selected file becomes a `File` object in the browser — an in-memory reference to the file on disk.

**Stage 2 — Metadata Extraction**
For each loaded file, `jsmediatags` reads the ID3 / MP4 / FLAC tags synchronously from the file's ArrayBuffer. Extracts: title, artist, album, album artist, year, track number, genre, duration, and cover art (APIC frame). If tags are missing, the filename is parsed as a fallback — e.g. `Artist - Title.mp3` → artist and title auto-filled.

**Stage 3 — Library Indexing**
Each track is written to the Dexie `tracks` table immediately. The library list re-renders with the new tracks visible. User sees their files appear in the library within milliseconds of selection.

**Stage 4 — Duration Calculation**
Duration from ID3 tags is often inaccurate. A hidden `<audio>` element loads each file as a blob URL and reads `audioElement.duration` for the accurate value. This runs in the background — the track is playable before this completes, duration updates when ready.

**Stage 5 — Cover Art Display**
If an APIC frame was extracted, it is converted to a blob URL via `URL.createObjectURL` and set as the album art image src. Blob URLs are stored in a ref map — revoked when the track is removed from the library to prevent memory leaks.

**Stage 6 — Analysis Queue**
Each newly loaded track is added to the analysis queue. essentia.js WASM processes tracks one at a time in a Web Worker. BPM, key, mood, energy results appear as chips on the track row as they complete — non-blocking, progressive.

**Supported formats:**
MP3, FLAC, WAV, AIFF, AAC, M4A, OGG, OPUS, WebM audio. The browser's native audio decoder handles all of these. For unsupported formats, `@ffmpeg/ffmpeg` is lazy-loaded and transcodes to WebM on demand — user sees a "Converting…" indicator.

**Error handling:**
If a file cannot be decoded, a toast notification shows "Could not play [filename] — format not supported." The track remains in the library marked with an error badge. Never crash the app for a single bad file.

| Package | Purpose | Install |
|---|---|---|
| jsmediatags | Read ID3v1/v2, MP4, OGG, FLAC tags from File object in browser | `npm install jsmediatags` |
| @ffmpeg/ffmpeg + @ffmpeg/util | Lazy-loaded fallback for exotic formats — transcodes to WebM | `npm install @ffmpeg/ffmpeg @ffmpeg/util` |
| Dexie.js | Write track metadata to IndexedDB immediately on load | Already listed |

---

### Step 2 — AudioContext Lifecycle

**Creation:**
One `AudioContext` instance is created for the entire app session. It is created on the first user gesture — specifically the first play button click. Never create it on page load. Mobile browsers will block audio that starts without a user gesture.

**Suspension:**
On Safari and iOS Safari, the AudioContext may enter `suspended` state after a period of inactivity. Before every `play()` call, check `audioContext.state` and call `audioContext.resume()` if suspended. This must be inside the play button's click handler to count as a user gesture.

**Sample rate:**
The AudioContext uses the device's native sample rate — typically 44100Hz or 48000Hz. Never hardcode a sample rate. Let the browser choose. FLAC files at 96kHz are automatically resampled by the browser's decoder to the AudioContext sample rate — this is expected and correct.

**Browser support:** ✅ Chrome · ✅ Firefox · ✅ Safari (resume on gesture required) · ✅ Edge · ✅ Android Chrome · ✅ iOS Safari (resume on gesture required)

| Package | Purpose | Install |
|---|---|---|
| Web Audio API — AudioContext | Native browser API. No library needed. | Native browser API |

---

### Step 3 — Core Playback Controls

**Play:**
- Read the selected track's `File` object
- Call `file.arrayBuffer()` to get raw bytes
- Call `audioContext.decodeAudioData(arrayBuffer)` to get an `AudioBuffer`
- Create an `AudioBufferSourceNode`, connect it to the DSP chain input GainNode
- Call `source.start(0)` to begin playback immediately
- Store the source node reference, the start time (`audioContext.currentTime`), and the start offset in state

**Pause:**
- Record the current position: `pausePosition = audioContext.currentTime - trackStartTime`
- Call `source.stop()` and disconnect the source node
- Store `pausePosition` — this is where playback resumes

**Resume:**
- Decode the same file again (or use cached AudioBuffer if available)
- Create a new `AudioBufferSourceNode`
- Call `source.start(0, pausePosition)` — second argument is the offset to start from
- Update `trackStartTime = audioContext.currentTime - pausePosition`

**Stop:**
- Call `source.stop()`
- Reset `pausePosition` to 0
- Clear the Now Playing display

**Seek:**
- Stop the current source node
- Create a new `AudioBufferSourceNode` from the cached `AudioBuffer`
- Call `source.start(0, seekPosition)` where `seekPosition` is in seconds
- Update `trackStartTime = audioContext.currentTime - seekPosition`

**Current Position (for seek bar and waveform cursor):**
`currentPosition = audioContext.currentTime - trackStartTime`
Polled in a `requestAnimationFrame` loop for smooth UI updates. Never use `setInterval` for this — it drifts.

**AudioBuffer caching:**
Decoding an `AudioBuffer` from a large FLAC file takes 200–500ms. Cache the decoded `AudioBuffer` in a Map keyed by track ID. The next play of the same track is instant. Clear cache entries when tracks are removed from the library. Cap the cache at 5 tracks to limit memory usage.

**Browser support:** ✅ Chrome · ✅ Firefox · ✅ Safari · ✅ Edge · ✅ Android Chrome · ✅ iOS Safari

| Package | Purpose | Install |
|---|---|---|
| Web Audio API — AudioBufferSourceNode, AudioBuffer | Core playback nodes. Native. | Native browser API |

---

### Step 4 — Playback Control Bar UI

The persistent control bar at the bottom of the screen. Always visible. Never hidden.

**Left section — Track Info:**
- Album art thumbnail (40×40px rounded). Fallback to color gradient if no art.
- Track title — truncated with ellipsis if too long
- Artist name — muted color, smaller font
- Clicking the track info opens the Now Playing panel

**Center section — Transport Controls:**
- Previous track button
- Play / Pause button — large, prominent. Shows spinner while decoding.
- Next track button
- Seek bar — full-width slider showing current position and duration
- Current time display (left of seek bar) and total duration (right)

**Right section — Secondary Controls:**
- Volume slider with mute toggle button
- Shuffle toggle button — three states: Off / True Random / Smart Shuffle
- Loop toggle button — three states: Off / Loop Track / Loop Queue
- Playback speed indicator (shows current speed, click to open speed panel)
- Queue button — opens the queue sidebar
- Visualizer toggle button

**Seek bar interaction:**
- Drag: update position display in real time while dragging, seek on release
- Click: seek immediately to clicked position
- Keyboard: focused seek bar responds to arrow keys (±5 seconds per press)

**Volume:**
- Slider: 0–100%
- Mute toggle: sets GainNode gain to 0 without moving the slider position
- Volume stored in Dexie — persists across sessions

**Now Playing Panel (expanded view):**
- Full album art (centered, large)
- Track title, artist, album, year
- Waveform display with click-to-seek
- Chord timeline (if analysed)
- Dynamic background gradient from album art dominant color
- Close button returns to library view

**Browser support:** ✅ Universal — all UI, no browser-specific APIs

| Package | Purpose | Install |
|---|---|---|
| Framer Motion | Smooth transitions for play/pause icon swap, panel open/close | Already listed |
| Lucide React | All control bar icons — Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat | Already listed |

---

### Step 5 — Queue Management

The queue is the ordered list of tracks that will play next. It is the heart of the playback flow.

**Queue operations:**
- **Play Now** — clears the queue, adds the selected track, begins playback immediately
- **Play Next** — inserts track at position 0 in the queue (plays after current track ends)
- **Add to Queue** — appends track to end of queue
- **Remove from Queue** — removes a specific track from any position
- **Clear Queue** — empties the entire queue
- **Drag to Reorder** — drag any queue item to a new position

**Queue sidebar:**
- Always accessible via the queue button in the control bar
- Shows current track at top (highlighted)
- Shows upcoming tracks in order
- Drag handle on each item for reordering
- Right-click context menu: Play Next, Remove, Add to Playlist

**Auto-advance:**
When a track ends, the next track in the queue plays automatically. If the queue is empty and Loop Queue is off, playback stops. If Loop Queue is on, the queue restarts from the beginning.

**Shuffle modes:**
- **Off** — tracks play in queue order
- **True Random** — Fisher-Yates shuffle applied to the remaining queue on shuffle toggle
- **Smart Shuffle** — avoids repeating the same artist consecutively, avoids mood whiplash by preferring adjacent energy levels

**Loop modes:**
- **Off** — plays queue once, stops
- **Loop Track** — current track repeats indefinitely. `AudioBufferSourceNode.loop = true` is NOT used — instead, the track is re-queued at position 0 on each end to maintain the DSP chain state correctly.
- **Loop Queue** — when last track ends, queue restarts from the first track

**History:**
Previous button plays the last track from history. History is a circular buffer of the last 50 played tracks stored in state.

**Browser support:** ✅ Universal

| Package | Purpose | Install |
|---|---|---|
| @dnd-kit/core + @dnd-kit/sortable | Drag to reorder queue items | Already listed |
| Dexie.js | Persist queue and play history | Already listed |

---

### Step 6 — Keyboard Shortcuts for Playback

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `→` | Seek +5 seconds |
| `←` | Seek −5 seconds |
| `Shift + →` | Next track |
| `Shift + ←` | Previous track |
| `↑` | Volume +5% |
| `↓` | Volume −5% |
| `M` | Mute toggle |
| `L` | Cycle loop mode |
| `S` | Toggle shuffle |

All shortcuts are blocked when a text input, textarea, or contenteditable element is focused — prevents firing while the user types in the search bar or chat.

**Browser support:** ✅ Universal

---

### Step 7 — Format Support Details

| Format | Decoder | Notes |
|---|---|---|
| MP3 | Native browser | Universal support. Most common format. |
| FLAC | Native browser | Supported in all modern browsers since 2020. |
| WAV | Native browser | Universal support. |
| AAC / M4A | Native browser | Supported on all browsers. |
| OGG Vorbis | Native browser | Supported on Chrome, Firefox, Edge. Not Safari. Falls back to ffmpeg.wasm on Safari. |
| OPUS | Native browser | Supported on Chrome, Firefox, Edge. Not Safari. Falls back to ffmpeg.wasm. |
| AIFF | Native browser | Supported on Safari and Chrome. Firefox uses ffmpeg.wasm fallback. |
| WMA | ffmpeg.wasm | Not natively supported in any browser. |
| ALAC | ffmpeg.wasm | Not natively supported in browsers. |
| WebM audio | Native browser | Universal. |
| MP4 video | Native browser | H.264 universal. H.265 Chrome/Safari only. |
| MKV | ffmpeg.wasm | Not natively supported. |
| MOV | Native browser | Safari and Chrome. ffmpeg.wasm fallback on Firefox. |

**The rule:** Always try native `audioContext.decodeAudioData` first. Only fall back to ffmpeg.wasm if native decoding throws an error. ffmpeg.wasm is ~31MB — lazy load it on demand, never in the initial bundle.

| Package | Purpose | Install |
|---|---|---|
| @ffmpeg/ffmpeg + @ffmpeg/util | Lazy-loaded fallback transcoder for unsupported formats | `npm install @ffmpeg/ffmpeg @ffmpeg/util` |

---

### Step 8 — Now Playing Metadata Display

Everything shown about the currently playing track.

**Required display elements:**
- Album art — extracted from APIC tag via `jsmediatags`. Falls back to color gradient from artist name hash.
- Track title — from TIT2 tag. Falls back to filename without extension.
- Artist — from TPE1 tag. Falls back to "Unknown Artist".
- Album — from TALB tag. Falls back to empty.
- Year — from TYER tag. Optional display.
- Track number — from TRCK tag. Optional display.
- Duration — from accurate `<audio>` element measurement.
- BPM — from analysis results once available. Shows "— BPM" while analysing.
- Key — from analysis results. Shows Camelot code + note name.
- Format badge — MP3 / FLAC / WAV / etc. shown as a small label.
- Sample rate — extracted from the AudioBuffer's `sampleRate` property after decoding.
- File size — from `File.size` in KB or MB.

**Dynamic background:**
Dominant color from album art (via `color-thief-browser`) applied as animated CSS gradient behind the Now Playing panel. Transitions smoothly on track change.

**Browser support:** ✅ Universal

| Package | Purpose | Install |
|---|---|---|
| jsmediatags | Extract all metadata tags from file | Already listed |
| color-thief-browser | Extract dominant color from album art | Already listed |

---

## Feature 1 — WebGL Nebula Visualizer

**The star driver. The GIF in the README. The screenshot that gets tweeted.**

**What it does:**
Full-screen WebGL particle system that responds to the music in real time. 100,000 particles form a nebula cloud. Bass frequencies cause particles to explode outward from the center. Treble frequencies cause shimmer and shimmer amplitude. Mid frequencies drive the vortex rotation speed. Color of the entire cloud shifts based on the detected musical key — C is red, C# is orange, running the full chromatic circle. Bloom post-processing gives the particles a glowing, cinematic quality.

**Three visualizer modes:**
- **Nebula** — 100,000 particle cloud. The hero mode. Bass-reactive explosions, key-colored, bloom glow.
- **Terrain** — 3D mountain range viewed from above. Bass frequencies raise the peaks. Camera auto-flies over the landscape.
- **Scope** — Retro dual-channel oscilloscope. CRT phosphor glow shader. Green on black.

**Album Color Mode:**
When a track has cover art, the dominant color is extracted and used as the primary particle palette. Every track in the library has a unique visual identity.

**iOS Safari handling:**
Particle count automatically reduced to 20,000 and bloom disabled on iOS — auto-detected via user agent. The experience is still visually strong.

**Browser support:** ✅ Chrome · ✅ Firefox · ✅ Safari · ✅ Edge · ✅ Android Chrome · ⚠️ iOS Safari (reduced particles, no bloom)

| Package | Purpose | Install |
|---|---|---|
| three | Core WebGL rendering engine | `npm install three` |
| @react-three/fiber | React wrapper for Three.js | `npm install @react-three/fiber` |
| @react-three/drei | Three.js helpers — OrbitControls, bloom pass, etc. | `npm install @react-three/drei` |
| color-thief-browser | Extract dominant color from album art for particle palette | `npm install color-thief-browser` |
| @types/three | TypeScript types for Three.js | `npm install -D @types/three` |

---

## Feature 2 — 10-Band Parametric EQ with Live Frequency Curve

**foobar2000 level audio control — in a browser tab — for free.**

**What it does:**
10 BiquadFilterNode bands chained in the Web Audio signal graph. Each band is individually adjustable and bypassable. As the user drags any band, the frequency response curve redraws on a canvas in real time — smooth, glitch-free, professional.

**Band configuration:**
- Band 1: Low shelf (20–500Hz)
- Bands 2–9: Peaking or notch, switchable per band (20Hz–20kHz)
- Band 10: High shelf (2kHz–20kHz)
- Each band: frequency slider (log scale), gain ±15dB, Q factor 0.1–10
- High-pass and low-pass filters at chain boundaries with slope selector (12 / 24 dB per octave)

**Presets:** Flat, Bass Boost, Vocal Presence, Hip-Hop, Electronic, Classical, Podcast, Acoustic. All stored in Dexie. User can save unlimited custom presets.

**Bypass:** Per-band toggle and full EQ bypass switch. Bypass is implemented by setting gain to zero — nodes are never disconnected from the graph to avoid audio clicks.

**Browser support:** ✅ Chrome · ✅ Firefox · ✅ Safari · ✅ Edge · ✅ Android Chrome · ✅ iOS Safari

| Package | Purpose | Install |
|---|---|---|
| Web Audio API | All EQ nodes are native BiquadFilterNode — no library needed | Native browser API |
| Dexie.js | Save and load EQ presets | Already listed |

---

## Feature 3 — BPM + Key + Mood Analysis (Local, Private, Automatic)

**Spotify charges for this. Mixed In Key charges $58. FineTune does it free, offline, for every track automatically.**

**What it does:**
Every file loaded into FineTune is automatically analysed in the background. A dedicated Web Worker runs essentia.js WASM — completely non-blocking. Results appear as chips and badges on each track in the library within seconds.

**Per-track outputs:**
- BPM — ±0.1 accuracy on standard music
- Musical key — note name (e.g. A minor) + Camelot Wheel code (e.g. 8A) for DJ compatibility
- Energy level — 0 to 100
- Danceability — 0 to 100
- Mood tag — Energetic / Calm / Melancholic / Euphoric / Focused / Dark
- LUFS loudness — for ReplayGain normalization

**UI display:**
- BPM chip on every track row (e.g. "128 BPM")
- Camelot key badge (e.g. "8A") with color per key
- Small colored energy dot — green for high energy, blue for calm
- Mood tag label

**Analysis queue:**
Processes one track at a time in the background. Progress shown as "Analysing 12 / 50 tracks…" Non-blocking — user can play music while analysis runs.

**Browser support:** ✅ Chrome · ✅ Firefox · ✅ Safari · ✅ Edge · ✅ Android Chrome · ✅ iOS Safari

| Package | Purpose | Install |
|---|---|---|
| essentia.js | Spotify's open-source audio analysis library compiled to WASM. Runs BPM, key, energy, danceability, mood, loudness algorithms. | `npm install essentia.js` |
| Dexie.js | Cache analysis results per file — keyed by filename + size hash | Already listed |

---

## Feature 4 — Chord Detection + Scrolling Timeline

**The Moises killer. Moises charges $4/month for this. FineTune does it locally, privately, free.**

**What it does:**
After a track is analysed, a scrolling chord timeline appears above the waveform. As playback moves forward, chord labels scroll in sync — the current chord is highlighted. A guitar chord diagram is shown for each detected chord — the correct fret positions drawn as an SVG.

**Capo Mode:**
User selects a capo fret (0–9) from a dropdown. FineTune instantly recalculates which open chord shapes to play for each detected chord at that capo position. A guitarist who capos at fret 2 sees the open chord names to play, not the theoretical chord names.

**Accuracy note:**
Chord detection uses chroma feature extraction and template matching — approximately 90–95% accurate on recordings with clear harmonic content. Labeled as "estimated chords" in the UI — honest about the limitation.

**Browser support:** ✅ Chrome · ✅ Firefox · ✅ Safari · ✅ Edge · ✅ Android Chrome · ✅ iOS Safari

| Package | Purpose | Install |
|---|---|---|
| essentia.js | ChordsDetection algorithm — returns chord labels per time segment | Already listed |
| Static SVG map | 48 SVG chord diagrams for all common major and minor chords — bundled in /public/chords/. No library needed, pure lookup table. | No install — static files |

---

## Feature 5 — BPM-Synced Smart Metronome

**Practice any song with a click track locked to its detected BPM. Moises charges for this.**

**What it does:**
A click track overlay that plays in perfect sync with the detected BPM of the current track. User can toggle it on or off at any time. A visual pulse animates on each beat. The downbeat gets a higher-pitch click than the other beats.

**Controls:**
- On / Off toggle
- Volume — independent of music volume
- Time signature — 4/4, 3/4, 6/8, 5/4
- Tap Tempo — user taps a button 4+ times to manually set BPM, overriding the detected value
- BPM override — manual number input for fine-tuning

**Visual pulse:**
A circle in the UI pulses on each beat — larger pulse on the downbeat. Syncs precisely to the AudioWorklet click output.

**Browser support:** ✅ Chrome · ✅ Firefox · ✅ Safari 14.1+ · ✅ Edge · ✅ Android Chrome · ✅ iOS Safari 14.5+

| Package | Purpose | Install |
|---|---|---|
| Web Audio API | AudioWorkletProcessor generates the click — a short sine burst at exact beat intervals. Native browser API. | Native browser API |
| essentia.js | Provides the detected BPM that the metronome locks to | Already listed |

---

## Feature 6 — Gapless Playback

**Spotify Premium charges for this. No browser player has it. Albums play exactly as mastered.**

**What it does:**
During the final 3 seconds of any track, FineTune silently pre-decodes the next track's AudioBuffer in a Web Worker. The next track is scheduled to start at the precise moment the current one ends on the Web Audio API timeline — zero milliseconds of silence.

**Settings:**
- Pre-buffer window: 1–10 seconds (user configurable)
- Crossfade: 0–6 seconds (optional — smooth fade between tracks instead of hard cut)
- Configurable via the settings panel — stored in Dexie

**Safari note:**
AudioBuffer scheduling has minor quirks in Safari. Gap may be 0–50ms in worst case. Still imperceptibly close to gapless and far better than any other browser player.

**Browser support:** ✅ Chrome · ✅ Firefox · ✅ Edge · ⚠️ Safari (near-gapless, ~50ms max gap) · ✅ Android Chrome · ⚠️ iOS Safari (same caveat)

| Package | Purpose | Install |
|---|---|---|
| Web Audio API | AudioBufferSourceNode pre-queue scheduling. Native browser API. | Native browser API |

---

## Feature 7 — A-B Loop + Pitch-Preserved Variable Speed

**Amazing Slow Downer costs $40. Transcribe! costs $40. This is free, in a browser, for every file.**

**What it does:**
User clicks any two points on the waveform to set an A point and a B point. Playback loops that region endlessly. Combined with the speed slider, musicians can slow down any passage without changing its pitch — perfect for learning solos, transcribing, or drilling a difficult section.

**A-B Loop:**
- Click waveform to set A, click again to set B
- Colored overlay shows the loop region
- Toggle loop on/off without losing the marked points
- Saved per track in Dexie — region persists within the session

**Variable Speed:**
- 0.25x to 4.0x range
- Pitch is fully preserved at every speed — no chipmunk effect, no slowed-down pitch shift
- Optional pitch-shift mode: unlock pitch from speed for creative use
- Pitch shift: ±12 semitones independent of speed — transpose any track in real time

**Browser support:** ✅ Chrome · ✅ Firefox · ✅ Safari 14.1+ · ✅ Edge · ✅ Android Chrome · ✅ iOS Safari 14.5+

| Package | Purpose | Install |
|---|---|---|
| soundtouch-ts | Pitch-preserving time stretch compiled as an AudioWorkletProcessor. The gold standard for browser-based pitch-aware speed control. | `npm install soundtouch-ts` |

---

## Feature 8 — Full DSP Signal Chain

**foobar2000 level audio processing — first time ever in a browser.**

**What it does:**
A full configurable audio processing pipeline. Every stage is individually bypassable. User can reorder stages via drag and drop. This is the feature that makes audio engineers star the repo.

**Signal chain:**
Input → ReplayGain → Parametric EQ → Bass Engine → Compressor → Stereo Widener → Reverb → Limiter → Output

**Each stage in detail:**

**ReplayGain**
Reads `REPLAYGAIN_TRACK_GAIN` tag from file metadata. Applies a gain offset so every track plays at consistent loudness. Falls back to calculated LUFS measurement if no tag is present.

**Bass Engine**
- Sub-bass booster: dedicated low shelf at 40Hz, ±12dB slider
- Bass shelf: simple ±dB shelf at 80Hz
- Bass compressor: DynamicsCompressorNode tuned for low-frequency tightness
- Mono bass mode: folds frequencies below 100Hz to mono — eliminates phase cancellation on mono speakers
- Harmonic bass enhancer: WaveShaperNode soft-clip curve on bass signal — synthesizes harmonic content on thin laptop speakers

**Compressor**
DynamicsCompressorNode with full controls: threshold, ratio, attack, release, knee, makeup gain. Live gain reduction meter shown as an animated bar.

**Stereo Widener**
Mid-Side matrix via custom AudioWorkletProcessor. Width 0 = mono, 100 = original, 200 = hyper-wide stereo.

**Convolution Reverb**
ConvolverNode with 4 impulse response presets bundled as small WAV files: Studio, Hall, Church, Outdoor. Dry/wet mix control.

**Limiter**
DynamicsCompressorNode configured as a brickwall limiter at -0.1 dBFS. Prevents any DSP combination from clipping the output.

**Browser support:** ✅ Chrome · ✅ Firefox · ✅ Safari · ✅ Edge · ✅ Android Chrome · ✅ iOS Safari

| Package | Purpose | Install |
|---|---|---|
| Web Audio API | All DSP nodes — BiquadFilterNode, DynamicsCompressorNode, ConvolverNode, WaveShaperNode, GainNode, ChannelSplitterNode, ChannelMergerNode. All native. | Native browser API |
| jsmediatags | Read ReplayGain tags from MP3/FLAC/AAC file metadata | `npm install jsmediatags` |
| 4 IR WAV files | Impulse responses for convolution reverb — bundled in /public/ir/. Studio.wav, Hall.wav, Church.wav, Outdoor.wav. Each under 300KB. | No install — static files |

---

## Feature 9 — Listen Together P2P Sync Rooms

**Spotify Jam requires Premium. Discord Watch Together requires Nitro. This is free, P2P, zero audio touching a server.**

**What it does:**
Host creates a room, gets a 6-character room code and shareable link. Friends join in their browser — no account, no download. Host plays music, everyone hears it in sync at the same position. Works when both users have the same file locally.

**How sync works:**
Host broadcasts playback state via WebRTC DataChannel — track identifier, current position, playing or paused, and a timestamp. Guest receives it and seeks to `position + network latency compensation`. Sync is accurate to within 100–200ms which is imperceptible for music.

**Track matching:**
Tracks are matched by `title + artist + duration` hash — not filename. Two people with the same album but different filenames still sync correctly.

**Room features:**
- Live text chat sidebar between all room members
- Emoji reactions float across the screen (🔥 💯 😭 ❤️)
- Queue display — guests see what is coming up in the host's queue
- Re-sync button for guests — manually re-syncs if drift occurs
- Room code + shareable URL — join by link, no copy-paste of code required

**iOS Safari note:**
WebRTC DataChannel is unreliable on iOS Safari. An info tooltip informs iOS users. The feature is not disabled — just flagged.

**Browser support:** ✅ Chrome · ✅ Firefox · ✅ Safari desktop · ✅ Edge · ✅ Android Chrome · ⚠️ iOS Safari (unreliable)

| Package | Purpose | Install |
|---|---|---|
| peerjs | WebRTC abstraction for P2P DataChannel connections | `npm install peerjs` |
| peerjs-server | Self-hosted signaling server. Deploy free on Railway. Avoids public PeerJS server rate limits. | `npm install peer` (server-side) |

---

## Feature 10 — Media Session API — Lock Screen + OS Controls

**Makes FineTune feel like a native app. Most browser players never implement this.**

**What it does:**
While FineTune is playing, the OS lock screen on mobile and the media notification on desktop show the current track's album art, title, artist name, and playback controls — previous, play/pause, next. Hardware media keys on keyboards work. Headphone inline button works.

**What users experience:**
- Phone screen locked, music playing — track info and controls visible on lock screen exactly like Spotify
- Hardware keyboard media keys skip tracks and pause without touching the browser
- OS media notification on Android shows the Now Playing card with artwork

**Browser support:** ✅ Chrome · ✅ Firefox 82+ · ✅ Safari 15+ · ✅ Edge · ✅ Android Chrome · ✅ iOS Safari 15+

| Package | Purpose | Install |
|---|---|---|
| Web APIs — navigator.mediaSession | Native browser API. No library needed. Handlers set for play, pause, previoustrack, nexttrack, seekto. | Native browser API |
| jsmediatags | Extract cover art from file for the MediaSession artwork image | Already listed |

---

## Feature 11 — Waveform Display + Click-to-Seek

**Visual, professional, and information-dense. Looks like Ableton Light in a browser tab.**

**What it does:**
A pixel-accurate waveform is rendered for every track. Clicking anywhere on the waveform seeks to that position instantly. The playback cursor moves smoothly in real time. The waveform is not a placeholder — it is decoded directly from the audio file's PCM samples.

**Visual layers on the waveform:**
- Played region: accent color
- Unplayed region: muted tone
- A-B loop region: colored overlay between the two markers
- Chord change markers: small colored triangles above the waveform at chord transition points
- Playback cursor: thin vertical line moving in real time

**Performance:**
Waveform decoding runs in a Web Worker using OffscreenCanvas — never blocks the main thread. A 10-minute FLAC file decodes and renders in under 1 second on a modern machine.

**Browser support:** ✅ Chrome · ✅ Firefox · ✅ Safari · ✅ Edge · ✅ Android Chrome · ✅ iOS Safari

| Package | Purpose | Install |
|---|---|---|
| Web Audio API | decodeAudioData to get PCM samples from the audio file | Native browser API |
| Canvas 2D API | OffscreenCanvas in a Web Worker for non-blocking rendering | Native browser API |

---

## Feature 12 — Album Art Color Extraction + Dynamic Background

**The polish that signals the builder cares. Every track has its own visual identity.**

**What it does:**
When a track has embedded cover art, the dominant colors are extracted from the image. These colors are applied to the player background as an animated gradient — shifting and breathing subtly while the track plays. Every track in the library has a unique visual identity. When tracks change, the background smoothly transitions between color palettes over 2 seconds.

**In the visualizer:**
The extracted palette is used as the primary particle color for the Nebula and Terrain visualizer modes — making the visualizer visually tied to the music playing.

**No art fallback:**
When a track has no cover art, a unique gradient is generated from the artist name string using a hash function. The result is deterministic — the same artist always produces the same gradient. No two artists produce the same colors.

**Browser support:** ✅ Chrome · ✅ Firefox · ✅ Safari · ✅ Edge · ✅ Android Chrome · ✅ iOS Safari

| Package | Purpose | Install |
|---|---|---|
| color-thief-browser | Extract dominant color and color palette from album art image | `npm install color-thief-browser` |
| jsmediatags | Extract embedded cover art from MP3/FLAC/AAC file | Already listed |

---

## Feature 13 — Smart Playlists — Private Discover Weekly

**Spotify's "brain" running locally on your machine. Zero cloud. Zero account. Zero algorithm deciding what you hear.**

**What it does:**
After analysis runs on loaded tracks, FineTune can generate smart playlists automatically using the BPM, key, energy, danceability, and mood data. These are not static playlists — they are generated fresh each time based on the current library's analysis data.

**Smart playlist generators:**

**Energy Arc**
Builds a playlist that flows from calm to energetic and back to calm. Configurable shape and duration. Good for workout sessions, study sessions, and long listening.

**Key Garden**
Sequences tracks using Camelot Wheel rules. Each track's key must be within ±1 step on the wheel from the previous track. Every transition is harmonically natural — no jarring key changes.

**Tempo Road**
Filter by BPM range using a dual-handle slider. Set 85–95 BPM for jogging. Set 140+ for high intensity. Set 60–70 for sleep.

**Mood Board**
A 2D canvas scatter plot showing every loaded track as a dot. X-axis is danceability. Y-axis is energy. User drags a lasso rectangle around any cluster of dots — those tracks become a playlist. The only music app in existence with this feature.

**Similar To This**
For any selected track, returns the 20 most similar tracks by Euclidean distance across BPM, key, energy, and mood vectors.

**Session note:**
On Firefox and Safari, smart playlists work fully within the session. They reset when the page is closed since the analysis cache does not persist without File System Access API handles. On Chrome and Edge, Dexie persists the analysis cache and playlists are available instantly on every visit.

**Browser support:** ✅ Chrome · ✅ Firefox · ✅ Safari · ✅ Edge · ✅ Android Chrome · ✅ iOS Safari (session-based on all non-Chrome browsers)

| Package | Purpose | Install |
|---|---|---|
| Dexie.js | Query analysis data for playlist generation | Already listed |
| Canvas 2D API | Mood Board scatter plot and lasso selection | Native browser API |

---

## Feature 14 — Global Chat Rooms

**Makes the app feel alive on Day 1. First visitors see other people. That human moment keeps users coming back.**

**What it does:**
A live global chat accessible from a sidebar in FineTune. Any user can join without an account — just pick a username on first visit. Three channels: #general, #now-playing, #find-music.

**Now Playing auto-post:**
When a track changes, FineTune optionally posts "🎵 Now playing: Artist — Title · 128 BPM · 8A" to #now-playing. Users can toggle this off.

**Chat features:**
- Real-time messages via Ably WebSocket
- Typing indicator — "3 people typing…"
- @mention highlighting — messages containing your username shown in accent color
- Emoji picker inline
- Message history — last 100 messages shown on join
- Online user count badge on the chat icon
- Rate limiting — 500ms minimum between messages to prevent spam

**Browser support:** ✅ Chrome · ✅ Firefox · ✅ Safari · ✅ Edge · ✅ Android Chrome · ✅ iOS Safari

| Package | Purpose | Install |
|---|---|---|
| ably | WebSocket SDK for real-time messaging. Free tier: 200 concurrent connections, 6M messages/month — sufficient for a V1 launch. | `npm install ably` |
| @emoji-mart/react | Emoji picker component | `npm install @emoji-mart/react @emoji-mart/data` |

---

## Feature 15 — PWA — Installs as a Native App

**"I installed a browser tab as a music player and it has lock screen controls." That sentence earns 200 stars.**

**What it does:**
FineTune is a fully installable Progressive Web App. On Chrome and Edge desktop, a custom "Install App" button appears in the UI. On Android, Chrome prompts for installation. On iOS Safari, users can "Add to Home Screen." Once installed, FineTune launches in its own window without any browser chrome — it looks and behaves like a native app.

**Offline mode:**
The app shell — all JavaScript, CSS, fonts — is cached by the Service Worker on first load. FineTune opens instantly on subsequent visits even with no internet connection. Since loaded files are on the user's device, playback works fully offline after the first visit.

**Browser support:** ✅ Chrome (best — full install prompt) · ✅ Edge · ✅ Android Chrome · ⚠️ iOS Safari (manual "Add to Home Screen") · ⚠️ Firefox (limited PWA support)

| Package | Purpose | Install |
|---|---|---|
| next-pwa | Generates Service Worker and handles offline caching automatically for Next.js | `npm install next-pwa` |

---

## Keyboard Shortcuts — Full Keyboard Control

Every action in FineTune is reachable from the keyboard. All shortcuts are rebindable and stored in Dexie.

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `→` / `←` | Seek ±5 seconds |
| `Shift + →` / `Shift + ←` | Next / Previous track |
| `↑` / `↓` | Volume ±5% |
| `M` | Mute toggle |
| `L` | Loop toggle |
| `S` | Shuffle toggle |
| `F` | Full-screen visualizer |
| `V` | Cycle visualizer mode |
| `E` | Toggle EQ panel |
| `C` | Toggle chord timeline |
| `B` | Toggle metronome |
| `A` | Set A loop point |
| `B` | Set B loop point |
| `/` | Focus search |
| `?` | Show all shortcuts |

**Browser support:** ✅ Universal — single `keydown` listener on `document`, guarded against firing when a text input is focused.

---

## Complete Dependency List

```
FRAMEWORK
next                        15.x
react                       18.x
typescript                  5.x

STYLING & ANIMATION
tailwindcss                 3.x
framer-motion               11.x

STORAGE
dexie                       3.x

AUDIO ENGINE
Web Audio API               Native — no install
soundtouch-ts               1.x

3D VISUALIZER
three                       0.165.x
@react-three/fiber          8.x
@react-three/drei           9.x

AUDIO ANALYSIS
essentia.js                 0.1.x

METADATA
jsmediatags                 3.x

SOCIAL
ably                        2.x
peerjs                      1.x

UI UTILITIES
@tanstack/react-virtual     3.x
@dnd-kit/core               6.x
@dnd-kit/sortable           7.x
@emoji-mart/react           1.x
@emoji-mart/data            1.x
color-thief-browser         2.x
lucide-react                0.383.x
sonner                      1.x
html2canvas                 1.x

PWA
next-pwa                    5.x

STATIC FILES (no install — bundle in /public/)
/public/ir/studio.wav       Reverb impulse response — Studio room
/public/ir/hall.wav         Reverb impulse response — Concert hall
/public/ir/church.wav       Reverb impulse response — Church
/public/ir/outdoor.wav      Reverb impulse response — Outdoor
/public/chords/*.svg        48 guitar chord diagram SVGs

DEV DEPENDENCIES
@types/three                0.165.x
```

---

## What Is Intentionally NOT in V1

These features were cut because they only work on Chrome/Edge and would create a two-tier user experience:

| Feature | Reason Cut | Planned For |
|---|---|---|
| Folder picker with persistence | `showDirectoryPicker` Chrome/Edge only | V1.5 as progressive enhancement |
| Metadata write-back to disk | `FileSystemWritableFileStream` Chrome/Edge only | V1.5 |
| Cover art save to file | Same as above | V1.5 |
| Multi-folder library | Requires persistent handles | V1.5 |
| Queue persistence across sessions | Tied to persistent handles | V1.5 |
| Stem separation | 80MB ONNX model — too heavy for launch | V2 |
| DJ mode | Complex, needs BPM sync proven first | V2 |
| Lyrics transcription | 150MB Whisper model — too heavy | V2 |

V1.5 means adding Chrome/Edge-specific enhancements as a progressive upgrade — same codebase, feature-detected at runtime, never shown to users on unsupported browsers.

---

## Build Order Rules

1. Get file loading and playback working before touching any other feature
2. Build the EQ before the visualizer — audio correctness first, visuals second
3. Run essentia.js analysis in a Web Worker from Day 1 — retrofitting this later is painful
4. Build the waveform renderer in OffscreenCanvas from Day 1 — same reason
5. Add the visualizer after the core player is solid — Day 9–10 as per the 15-day plan
6. Chat and Listen Together rooms last — they require backend setup
7. Test every audio feature with MP3, FLAC, and WAV at 44.1kHz, 48kHz, and 96kHz before moving on
8. Commit after every working feature — never accumulate 3 days of changes without a clean commit

---

*FineTune V1 Feature Specification — April 2026*
*Zero browser discrepancy. Every feature. Every browser. Every user.*
