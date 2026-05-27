# Getting Started with AloMedia

## What is AloMedia

AloMedia is a browser-based non-linear video editor. Users can import media (video, audio, images), arrange clips on a multi-track timeline, apply transformations and color adjustments, add text overlays and transitions, preview in real time, and export to MP4/MOV/MKV/AVI using either client-side FFmpeg.wasm or a server-side encoding fallback.

## Tech Stack

- **Frontend:** React 19 + TypeScript 5.9 + Vite 7
- **State:** Zustand 5 for editor state, TanStack Query 5 for server data
- **Styling:** Tailwind CSS v4 with CSS variables for design tokens
- **Routing:** React Router 7
- **i18n:** i18next with browser language detection (en/es supported)
- **Video/Audio:** HTML5 `<video>`/`<audio>` elements synchronized by a custom requestAnimationFrame loop
- **Export:** FFmpeg.wasm multi-threaded core + optional server-side GPU/CPU encoding
- **Local Cache:** IndexedDB for file deduplication by SHA-256 hash

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

The postinstall script copies FFmpeg core files to `public/ffmpeg-core/`.

### 2. Environment Variables

Create a `.env` file in the project root:

```env
VITE_BASE_URL=https://your-backend-api.com
VITE_EXPORT_SERVER_URL=https://your-export-server.com
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_BASE_URL` | Yes | Base URL for auth and project API |
| `VITE_EXPORT_SERVER_URL` | No | Export server URL. Falls back to WASM if omitted/unavailable |

### 3. Development Server

```bash
npm run dev
```

> **Important:** For FFmpeg.wasm to work, the dev server must serve with COOP/COEP headers. Vite config includes these headers for development.

### 4. Production Build

```bash
npm run build
```

The prebuild script ensures FFmpeg core files are in place.

## First-Time Walkthrough

1. Open the landing page at `/`
2. Register an account at `/auth/register` or login at `/auth/login`
3. Go to `/dashboard` and create a new project
4. Open the project in the editor (`/editor/:projectId`)
5. Import a video via drag-and-drop or file picker
6. Drag the media onto the timeline
7. Play the preview to verify playback
8. Make edits (trim, move, add transitions)
9. Export via the Export modal (top-right)
10. Save the project to the server

## Mental Model for Contributors

### Three Separate Concerns

The editor maintains strict separation between:

1. **Domain Data Editing** — Zustand store, immutable updates, undo/redo snapshots
2. **Real-Time Playback** — RAF loop, video double-buffering, audio pool, no React re-renders per frame
3. **Final Render/Export** — Render plan → filter graph → FFmpeg execution → file download

### What React Does NOT Render Every Frame

The preview player uses raw DOM video elements synchronized by `requestAnimationFrame`. React only renders the container and controls; the actual video frames are handled by the browser's media decoder.

### FileMap Lives Outside Zustand

`File` objects are stored in a module-level `Map<string, File>` (`fileMap`) outside the reactive store because:
- Files are not JSON-serializable
- They should not participate in undo snapshots
- They are resolved from IndexedDB on project load

### Time is Always in Seconds (with Millisecond Precision)

All timeline values are stored in seconds but rounded to integer-millisecond precision. Always use `toMs()` / `toSeconds()` from `utils/time.ts` to guarantee bitwise-identical boundaries.

## Golden Rules for Changes

1. **If you change clip types**, review: store, preview player, export pipeline, and serialization.
2. **Maintain temporal normalization** to millisecond precision using `toMs`/`toSeconds`.
3. **Never add reactive Zustand state for large binary objects** (blobs, ArrayBuffers, Files).
4. **Document new behavior** in the relevant docs file in this folder.
5. **Respect clip identity**: clip IDs are the real identity, not media IDs. The same media can be referenced by multiple clips.
6. **Consider undo on every mutation**: call `pushHistory()` after meaningful changes.
7. **Update the clip index** when project structure changes (handled by store actions).
8. **Handle missing media gracefully**: check `missingMediaIds` set during project load.

## Common Onboarding Mistakes

1. **Testing export without COOP/COEP headers** in development. FFmpeg.wasm requires cross-origin isolation.
2. **Assuming preview and export are pixel-identical**. Preview uses CSS filters; export uses FFmpeg filters. Results are close but not exact.
3. **Forgetting that `fileMap` is not in the serializable project tree**. Project save/load only handles metadata; files are cached by hash in IndexedDB.
4. **Modifying timeline without considering collisions and snapping**. The store resolves overlaps and applies snap-to-clip behavior.
5. **Not pausing playback before mutations**. The history slice automatically pauses the player on `pushHistory()`, but manual mutations should also pause.

## What to Read Next

1. [ARCHITECTURE.md](ARCHITECTURE.md) — Understand the five layers
2. [VIDEO_EDITOR_WORKFLOW.md](VIDEO_EDITOR_WORKFLOW.md) — Learn the end-to-end editor flow
3. [FFMPEG_EXPORT.md](FFMPEG_EXPORT.md) — Deep dive into the export system
4. [DATA_STRUCTURES.md](DATA_STRUCTURES.md) — Master the data structures that power the editor
