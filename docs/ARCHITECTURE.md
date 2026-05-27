# Architecture

## Overview

AloMedia's architecture is divided into **five layers**, each with clear responsibilities and boundaries. The design prioritizes separation of concerns between UI, state, playback, export, and external services.

```
┌─────────────────────────────────────────┐
│         1. User Interface Layer          │
│   Components, pages, layouts, modals    │
├─────────────────────────────────────────┤
│         2. Application State Layer       │
│   Zustand store (slices), undo/redo     │
├─────────────────────────────────────────┤
│         3. Player Engine Layer           │
│   RAF loop, video buffers, audio pool   │
├─────────────────────────────────────────┤
│         4. Render/Export Engine Layer    │
│   Render plans, filter graphs, FFmpeg   │
├─────────────────────────────────────────┤
│         5. Integration Services Layer    │
│   HTTP client, auth, projects, cache    │
└─────────────────────────────────────────┘
```

---

## 1. User Interface Layer

**Responsibilities:**
- Capture user intent (clicks, drags, keyboard shortcuts)
- Reflect current project state visually
- Orchestrate panels: media library, preview, inspector, timeline, modals

**Key Artifacts:**

| Path | Role |
|------|------|
| `src/components/editor/*` | Editor-specific components (Timeline, Preview, Inspector, Toolbar, etc.) |
| `src/components/ui/*` | Reusable UI primitives (Dropdown, RangeSlider, IconButton, etc.) |
| `src/components/common/*` | Shared layout pieces (Footer, PageHeader, SectionCard) |
| `src/pages/editor/VideoEditor.tsx` | Main editor orchestration page |
| `src/pages/dashboard/DashboardPage.tsx` | Project dashboard |
| `src/pages/auth/*` | Login, register, password recovery |
| `src/pages/landing/LandingPage.tsx` | Marketing landing page |
| `src/pages/admin/AdminPage.tsx` | Admin dashboard |

**Design Principles:**
- Components read from Zustand and call store actions; they do not mutate state directly.
- Editor components avoid per-frame re-renders by subscribing only to stable state slices.
- Modal system is centralized; each modal is a self-contained component that receives callbacks.

---

## 2. Application State Layer

**Responsibilities:**
- Centralize all project mutation rules
- Maintain selection, zoom, playback state
- Persist action history for undo/redo
- Manage proxy generation state for video previews

**Implementation:**

A single Zustand store composed of five slices:

| Slice | File | Responsibility |
|-------|------|----------------|
| `ProjectSlice` | `src/store/slices/projectSlice.ts` | Project data: tracks, clips, media, groups, transitions |
| `PlaybackSlice` | `src/store/slices/playbackSlice.ts` | Playhead position, play/pause state |
| `UiSlice` | `src/store/slices/uiSlice.ts` | Selection, zoom, clipboard, group editing |
| `HistorySlice` | `src/store/slices/historySlice.ts` | Undo/redo stack management |
| `ProxySlice` | `src/store/slices/proxySlice.ts` | Proxy video generation status per media |

**Immutable Updates:**
All state mutations use immutable patterns (spread, `.map()`, `.filter()`) to ensure React detects changes via referential equality.

**Undo/Redo:**
The history system stores full project snapshots (deep-cloned via `JSON.parse(JSON.stringify(...))`). This simplifies consistency at the cost of memory. See [DATA_STRUCTURES.md](DATA_STRUCTURES.md) for the two-stack implementation.

---

## 3. Player Engine Layer

**Responsibilities:**
- Advance playhead in real time via `requestAnimationFrame`
- Synchronize active video and audio elements
- Minimize jank during clip transitions
- Apply per-clip transforms and color adjustments in preview

**Key Design Principles:**
- **No React re-renders per frame.** The RAF loop updates DOM elements directly via refs.
- **Shared refs** for hot-path read/write between the loop and UI controls.
- **Periodic store sync** (every N frames) to keep playhead position consistent with UI.

**Subsystems:**

### Video Playback (`src/player/video/`)
- `VideoBufferManager` — Double-buffered `<video>` elements. One plays the active clip; the other preloads the next clip. Swaps are gated on `canplay` to prevent freezes.
- `videoTransitions.ts` — CSS-based transition approximation (fade, wipe, slide) during crossfade windows.
- `secondaryVideoSync.ts` — Synchronizes secondary video elements.

### Audio Playback (`src/player/audio/`)
- `audioPool.ts` — Maintains a `Map<string, HTMLAudioElement>` per audio track. Creates/destroys elements as tracks change.
- `audioSync.ts` — Synchronizes playback position, volume, mute, speed, and fade per active audio clip.

### Timeline Resolution (`src/player/timeline/`)
- `activeClipResolver.ts` — Determines which clip is active at a given playhead position.
- `clipLookup.ts` — Binary-search based clip index for O(log n) active-clip queries.

### Render Utils (`src/player/render/`)
- `canvasScaling.ts` — Calculates canvas scaling for preview.
- `transformUtils.ts` — Applies CSS `transform` and filter strings for preview.

### RAF Loop (`src/player/core/`)
- `rafLoop.ts` — The core animation frame loop. Computes delta time, advances playhead, triggers frame callbacks, and syncs to store at intervals.
- `playerReset.ts` — Resets player state on project load/unload.

---

## 4. Render/Export Engine Layer

**Responsibilities:**
- Convert editor project state into a render plan
- Build FFmpeg filter graphs for complex compositions
- Orchestrate the full export lifecycle
- Provide fallback between client-side WASM and server-side encoding

**Subsystems:**

### Export Pipeline (`src/engine/exportPipeline/`)
- `index.ts` — Main entry point: probes media, builds render plan, selects engine, executes export.
- `engineRouter.ts` — Chooses between `server` and `wasm` based on health checks.
- `planBuilder.ts` — Converts `Project` + `ExportOptions` into a `RenderPlan`.
- `filterGraphBuilder.ts` — Generates FFmpeg `-filter_complex` strings for video overlay, audio mixing, text rendering, and transitions.
- `commandBuilder.ts` — Builds the final FFmpeg CLI arguments for WASM execution.
- `streamCopyAnalyzer.ts` — Detects when a single unmodified clip can use `-c copy` for fast export.
- `progressTracker.ts` — Maps FFmpeg stderr output to progress percentages.
- `textRenderer.ts` — Renders text clips to PNG images for FFmpeg overlay.
- `probe.ts` — Derives media properties (codec, resolution, fps) from known metadata.
- `wasmEncoder.ts` — Loads FFmpeg.wasm, writes inputs to virtual FS, executes command, reads output blob.
- `serverEncoder.ts` — Uploads media + plan to export server, polls for progress, downloads result.
- `encodingPresets.ts` — Defines output targets (MP4/MOV/MKV/AVI, H264/VP9/AV1, quality presets).

### Transitions (`src/engine/`)
- `transitionRegistry.ts` — Registry of available transition types (fade, wipeleft, wiperight, slideleft, slideright, circlecrop, distance).
- `transitionCompiler.ts` — Compiles clip-level `transitionIn`/`transitionOut` into canonical `TransitionEdge` records.
- `transitionCutoverFlag.ts` — Feature flag and metadata for transition system cutover.

### Proxy Generation (`src/engine/`)
- `proxyEngine.ts` — Generates low-resolution, audio-less proxy videos for smoother timeline scrubbing using FFmpeg.wasm single-threaded core.

---

## 5. Integration Services Layer

**Responsibilities:**
- Unified HTTP client with error handling
- Authentication service (login, register, logout, recovery)
- Project CRUD service (list, create, update, delete, share)
- Local file cache service (IndexedDB by SHA-256 hash)
- AI media service (audio cleaning, transcription)

**Artifacts:**

| Path | Role |
|------|------|
| `src/api/http.ts` | Base `fetch` wrapper with JSON parsing and `ApiError` throwing |
| `src/api/errors.ts` | `ApiError` class with status code and field-level errors |
| `src/api/aiMedia.ts` | Multipart form-data uploads for AI audio processing |
| `src/services/authService.ts` | Sign in/up/out, me, password recovery |
| `src/services/projectService.ts` | Project CRUD and sharing |
| `src/services/fileCacheService.ts` | IndexedDB file cache with 30-day TTL |
| `src/services/projectMediaSyncService.ts` | Syncs project media with local cache on load |

---

## Main Data Flow

```
1. UI dispatches store action
        ↓
2. Store mutates project state immutably
        ↓
3. History slice records snapshot (undo)
        ↓
4. Player consumes derived state for preview
        ↓
5. Engine consumes state for export
        ↓
6. Services persist/load timeline and session
```

### Example: User Drags a Clip

1. **UI:** `Timeline.tsx` captures drag end, calls `moveClip()` from `projectSlice.timelineActions`
2. **Store:** `projectSlice` validates position, resolves collisions, applies snapping, updates `tracks` array
3. **History:** `historySlice.pushHistory("Move clip")` records the new project snapshot
4. **Player:** Next RAF frame reads new clip positions, updates active video element seek position
5. **Export:** On next export, `planBuilder` reads the updated timeline and builds new segments

---

## Key Architectural Decisions

### 1. Separation of Serializable Metadata and Binary Files

Project state (tracks, clips, transitions, groups) is pure JSON and can be saved to the server. `File` objects live in `fileMap` and IndexedDB, resolved by `media.hash`. This allows projects to be shared and reopened without re-uploading files if the local cache still holds them.

### 2. Full Snapshots for Undo History

Instead of delta-based undo, the system stores complete project snapshots. This eliminates consistency bugs at the cost of memory. For typical sessions (tens to low hundreds of actions), this is acceptable.

### 3. Proxy Videos for Timeline Scrubbing

Full-resolution video decoding is too slow for smooth scrubbing. Proxy videos (lower resolution, no audio) are generated on import and used during preview. The original file is used only for export.

### 4. Dual-Engine Export (WASM + Server)

If a server export endpoint is available and healthy, the system prefers it for speed (especially with GPU acceleration). Otherwise, it falls back to client-side FFmpeg.wasm. Users can also force either engine.

### 5. Double-Buffered Video Elements

Video clip transitions use two `<video>` elements per manager. One plays while the other preloads. This avoids the flash-of-black when switching between clips.

### 6. Audio Pool per Track

Audio is not embedded in video elements (which are muted). Instead, a pool of `<audio>` elements is maintained per track, allowing independent volume, speed, fade, and balance control per clip.

---

## Trade-offs

| Decision | Benefit | Cost |
|----------|---------|------|
| Full history snapshots | Simple, correct, easy to test | Memory grows linearly with history depth |
| Array-based timeline with linear collision detection | Simple, serializable, Zustand-friendly | O(n) collision check; degrades on very dense timelines |
| HTML media elements + RAF | Fast decoding, browser-native | Requires manual sync; drift correction needed |
| WASM export | No server dependency, privacy | Slower, memory-intensive, requires COOP/COEP |
| Server export fallback | Fast, GPU-accelerated | Requires internet, upload bandwidth, server uptime |
| Proxy generation | Smooth scrubbing | Extra storage, extra CPU on import, slight delay |

---

## Directory Structure Reference

```
src/
├── api/               # HTTP client and API wrappers
├── components/        # React components
│   ├── admin/         # Admin dashboard components
│   ├── common/        # Shared layout components
│   ├── dashboard/     # Dashboard-specific components
│   ├── editor/        # Video editor components
│   ├── projects/      # Project list components
│   └── ui/            # Reusable UI primitives
├── config/            # i18n configuration
├── constants/         # Application constants
├── context/           # React contexts (Auth, Theme)
├── engine/            # Export and render engine
│   └── exportPipeline/# Export pipeline modules
├── hooks/             # Custom React hooks
├── layouts/           # Page layouts (Auth, Public)
├── locales/           # Translation files (en, es)
├── pages/             # Route-level page components
├── player/            # Real-time playback engine
├── project/           # Project types and serialization
├── routes/            # Route guards (Public, Private, Admin)
├── services/          # Business logic services
├── store/             # Zustand store and slices
├── types/             # Shared TypeScript types
├── utils/             # Utility functions
└── workers/           # Web workers (if any)
```
