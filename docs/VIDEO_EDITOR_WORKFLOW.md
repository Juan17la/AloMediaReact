# Video Editor Workflow

## Scope

This document describes the complete end-to-end workflow of the AloMedia video editor: initialization, media import, timeline editing, preview, inspector adjustments, AI tools, saving, sharing, and export.

## High-Level Flow

```
1. Editor Initialization
2. Project Load (remote or new)
3. Media Resolution (local cache)
4. Timeline Editing
5. Preview and Iterative Adjustment
6. Save / Share / Export
```

---

## 1. Editor Initialization

When the editor page mounts (`/editor/:projectId` or `/editor`):

1. **Reset previous state** — Player buffers, history, selection, and playback are cleared.
2. **Load project** — If `projectId` is present, call `getProjectById(id)`.
3. **Deserialize timeline** — `timelineData` string is parsed via `deserializeTimeline()` into a `Project` object.
4. **Resolve local files** — For each `Media` in `project.media`, attempt to retrieve the actual `File` from IndexedDB by `media.hash`.
5. **Register missing media** — Media not found in cache are added to `missingMediaIds` set. UI shows relink warnings.
6. **Build clip index** — `buildClipIndex()` creates a binary-searchable timeline index for fast active-clip lookup during playback.
7. **Initialize player** — Video buffer manager and audio pool are set up. Playhead resets to 0.

### New Project Path

If no `projectId` is provided:
- An empty project is created with `makeInitialProject()`
- One video track and one audio track are pre-created
- No media, no clips, no history

---

## 2. Media Import and Identification

### Input Methods

- **File picker** — Click "Import" in Media Library
- **Drag and drop** — Drop files onto the media library or timeline

### Import Pipeline

**File:** `src/store/slices/projectSlice.mediaActions.ts`

1. **Validate file type** — Check MIME type and extension against supported types (`VIDEO_EXTENSIONS`, `AUDIO_EXTENSIONS`, `IMAGE_EXTENSIONS`).
2. **Detect media category** — Map MIME type to `MediaType`: `video`, `audio`, `image`, `subtitles`.
3. **Calculate content hash** — SHA-256 of file content for deduplication (`utils/fileHash.ts`).
4. **Check for duplicates** — If a media with the same hash exists, reuse it instead of creating a new entry.
5. **Determine duration** — For video/audio, create a temporary `<video>`/`<audio>` element to read `duration`.
6. **Create Media metadata** — Build `Media` object with `id`, `name`, `type`, `format`, `duration`, `size`, `hash`.
7. **Register File** — Store the `File` object in `fileMap` (module-level Map outside Zustand).
8. **Cache in IndexedDB** — Call `saveFileToCache(hash, file)` for future project reloads.
9. **Add to project** — Spread `media` onto `project.media` array.
10. **Trigger proxy generation** — For videos, enqueue proxy generation to `proxyEngine`.

### Proxy Generation

**File:** `src/engine/proxyEngine.ts`

- Videos are transcoded to a lower-resolution, audio-less proxy using FFmpeg.wasm single-threaded core.
- Proxy states are tracked in `proxySlice`: `pending` -> `ready` | `error`.
- Preview uses the proxy URL (from `URL.createObjectURL`) instead of the original file for smooth scrubbing.

---

## 3. Timeline Editing

### Tracks

**File:** `src/project/projectTypes.ts`

- Tracks have `type: "video" | "audio"` and `order: number`.
- Higher `order` means higher visual priority (video tracks stack bottom-to-top).
- Audio tracks are mixed; all audible clips contribute to the output.
- The timeline supports any number of video and audio tracks.

### Clips

Clips are discriminated union types:

| Type | Properties |
|------|------------|
| `VideoClip` | `mediaId`, `mediaStart`, `mediaEnd`, `speed`, `transform`, `colorAdjustments`, `audioConfig`, `transitionIn`, `transitionOut` |
| `ImageClip` | `mediaId`, `transform`, `colorAdjustments` |
| `TextClip` | `content`, `transform`, `style` |
| `AudioClip` | `mediaId`, `mediaStart`, `mediaEnd`, `speed`, `volume`, `audioConfig` |

All clips extend `BaseClip`:
- `id: string` — unique clip identity
- `trackId: string` — which track it belongs to
- `timelineStart: number` — start time on timeline (seconds, ms precision)
- `timelineEnd: number` — end time on timeline (seconds, ms precision)

### Core Timeline Operations

**File:** `src/store/slices/projectSlice.timelineActions.ts`

| Operation | Description |
|-----------|-------------|
| **Insert media** | Drag from library to track, or double-click. Creates a clip spanning the media duration at the drop position. |
| **Move clip** | Drag clip to new position or track. Resolves collisions by pushing clips or finding adjacent valid positions. Applies snapping. |
| **Resize clip** | Drag clip edges to trim timeline start/end. Respects media bounds for video/audio. |
| **Split clip** | Split selected clip at current playhead position. Creates two adjacent clips sharing the same media. |
| **Extract audio** | Create a linked audio clip from a video clip on a separate audio track. |
| **Delete clip** | Remove clip from track. History recorded. |
| **Copy/Paste** | Copy selected clip to clipboard. Paste creates a new clip at playhead, resolving overlaps. |
| **Undo/Redo** | Full project snapshots via two-stack history system. |

### Collision Detection and Snapping

**Files:** `src/utils/clipCollision.ts`, `src/utils/snapUtils.ts`

When moving or inserting:

1. Calculate proposed start time.
2. Detect collision with existing clips on the target track.
3. If no collision: apply snapping to nearby clip boundaries (snap distance configurable).
4. If collision: find the nearest valid adjacent position after the colliding clip(s).

Snapping targets:
- Clip start/end boundaries on the same track
- Playhead position
- Grid intervals based on current zoom

### Clip Groups

**File:** `src/store/slices/uiSlice.ts`

- Users can group multiple clips (`createGroupFromSelection`).
- Grouped clips move together.
- Selecting one member selects the entire group.
- Ctrl+click enters "group edit mode" to select individual members.
- Groups have `locked` and `visible` flags for future expansion.

---

## 4. Preview System

### Playback Loop

**File:** `src/player/core/rafLoop.ts`

- Uses `requestAnimationFrame` for frame updates.
- Computes wall-clock delta and advances playhead.
- Syncs playhead to Zustand store periodically (not every frame).
- Stops automatically at project duration end.

### Video Preview

**File:** `src/player/video/videoBuffer.ts`

- `VideoBufferManager` maintains two `<video>` elements (double buffering).
- **Active element** plays the current clip.
- **Buffer element** preloads the next clip when within `PRELOAD_LOOKAHEAD_MS`.
- **Buffer swap** occurs when playhead crosses a clip boundary. Swaps are gated on `canplay` to avoid freezes.
- **Transitions** — During crossfade windows, both elements are visible with CSS opacity animations.
- **Drift correction** — If video `currentTime` deviates from expected by more than `DRIFT_CORRECTION_THRESHOLD_S`, a seek is issued.

### Audio Preview

**File:** `src/player/audio/audioPool.ts`, `src/player/audio/audioSync.ts`

- One `<audio>` element per audio track, managed in a `Map<string, HTMLAudioElement>`.
- Each frame, the active audio clip for each track is determined.
- Audio elements are seeked, played/paused, and have their `playbackRate`, `volume`, `muted` synced.
- Fade in/out and balance are applied via Web Audio API when supported.

### Compositing

**File:** `src/player/render/transformUtils.ts`

- Video elements are absolutely positioned within a preview container.
- CSS `transform` applies `translate`, `scale`, `rotate`.
- CSS `filter` applies brightness, contrast, saturation, gamma for preview.
- Note: Preview filters are CSS-based; export uses FFmpeg filters. Results are close but not identical.

---

## 5. Inspector Panel

When a clip is selected, the inspector shows contextual controls:

### Video Clip Inspector
- **Transform** — Position (X, Y), size (W, H), rotation
- **Color Adjustments** — Brightness, contrast, saturation, gamma, exposure, shadow, definition
- **Audio Config** — Volume, mute, fade in/out, balance
- **Speed** — Playback rate (affects both video and audio pitch/time)
- **Transitions** — `transitionIn` (start of clip) and `transitionOut` (end of clip)

### Image Clip Inspector
- **Transform**
- **Color Adjustments**

### Text Clip Inspector
- **Content** — Text string
- **Style** — Font size, family, color, background, alignment, opacity, bold, italic, line height
- **Transform** — Position, size, rotation

### Audio Clip Inspector
- **Audio Config** — Volume, mute, fade in/out, balance
- **Speed** — Playback rate

All inspector changes are committed to the store and trigger `pushHistory()` so they are undoable.

---

## 6. AI Audio Tools

**Files:** `src/components/editor/AiToolsModal.tsx`, `src/components/editor/AiToolsPanel.tsx`, `src/api/aiMedia.ts`

Available when a media item is selected in the library:

### Clean Audio
- Uploads the original audio/video file to `/ai/audio/clean`
- Backend returns a noise-reduced audio blob
- Frontend imports the result as a new media asset

### Transcribe Audio
- Uploads the file to `/ai/audio/transcribe` with `formats: ["srt"]`
- Backend returns an SRT subtitle file
- Frontend imports the SRT as a `subtitles` media type
- User can then add subtitle clips to the timeline

---

## 7. Save, Share, and Dirty State

### Dirty State

A project is "dirty" when the current store state differs from the last saved snapshot. This is tracked implicitly by comparing to the last known saved state or by checking if the user has made edits since the last save.

### Save Flow

1. **Serialize project** — `saveProject(project)` produces a `SavedProject` with schema version, timestamps, and canonicalized transition edges.
2. **Send to server** — `updateProject(id, { name, timelineData: JSON.stringify(project) })`
3. **Update reference** — Store remembers the saved state to clear dirty warnings.
4. **Cache files** — Ensure all media files are in IndexedDB.

### Share Flow

1. User clicks "Share" and enters an email.
2. Frontend calls `shareProject(id, email)`.
3. Backend grants access to the target user.
4. Shared projects appear in the "Shared with me" list on the recipient's dashboard.

### Local JSON Export/Import

- **Export:** `exportProjectJSON()` downloads the project as a `.json` file.
- **Import:** User loads a `.json` file; `loadProject()` validates structure, migrates schema version if needed, and loads into the store.

---

## 8. Export

See [FFMPEG_EXPORT.md](FFMPEG_EXPORT.md) for the deep technical export pipeline.

From the user's perspective:

1. Click "Export" button.
2. Choose format (MP4/MOV/MKV/AVI), codec (H264/VP9/AV1), resolution, FPS, quality preset.
3. System auto-selects engine (Server GPU > Server CPU > Browser WASM).
4. Progress modal shows stage (probing, planning, encoding, finalizing) and percent.
5. On completion, the video file downloads automatically.
6. Export can be cancelled at any time.

---

## 9. Keyboard Shortcuts

**File:** `src/hooks/useEditorKeyboardShortcuts.ts`

| Shortcut | Action |
|----------|--------|
| `Space` | Play / Pause |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Ctrl+C` | Copy selected clip |
| `Ctrl+V` | Paste clipboard clip |
| `Delete` / `Backspace` | Delete selected clip(s) |
| `S` | Split selected clip at playhead |
| `+` / `-` | Zoom timeline in / out |
| `Left Arrow` / `Right Arrow` | Step one frame backward / forward |
| `Shift + Arrows` | Step 10 frames |
| `Escape` | Close modals, exit group edit mode |

**Safety rule:** Shortcuts are disabled when focus is in a text input, textarea, or contenteditable element.

---

## 10. Functional Result

The editor workflow maintains three independent concerns:

1. **Domain data editing** — Immutable project mutations with undo/redo
2. **Real-time playback** — RAF-synchronized media elements without React per-frame overhead
3. **Final render** — Structured render plan -> filter graph -> FFmpeg -> downloadable file

This separation makes the system predictable for users and maintainable for developers.
