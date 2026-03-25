# AloMedia Architecture

## Overview

AloMedia is a browser-based NLE built with React, TypeScript, Zustand, and FFmpeg.wasm. The application is split into three runtime layers coordinated by route-level pages:

1. UI Layer: React pages/components and interaction flows.
2. Player Layer: frame-driven preview playback and media synchronization.
3. Engine Layer: FFmpeg-backed proxy generation and final export.

The Zustand editor store is the shared state boundary between UI and runtime subsystems.

## Runtime Composition

The root tree (from `src/main.tsx`) is:

```
StrictMode
└── QueryClientProvider
    └── AuthProvider
        └── App
            └── RouterProvider
```

The route configuration (in `src/router.tsx`) currently includes:

- Public auth routes under `/auth/*` through `PublicRoute`.
- Private routes `/dashboard` and `/editor/:projectId` through `PrivateRoute`.
- A direct `/editor` route used for development/testing.
- A fallback redirect to `/auth/login`.

## Layered Architecture

```
UI Layer (React)
├── pages/*, layouts/*, components/*
└── hooks/*

State Layer (Zustand)
├── project slice
├── playback slice
├── ui slice
├── history slice
└── proxy slice

Player Layer
├── hooks/useMediaSync.ts
├── audio/*
├── video/*
└── timeline/*

Engine Layer
├── renderPipeline.ts
├── exportOrchestrator.ts
├── filterGraphBuilder.ts
├── ffmpegEngine.ts
└── proxyEngine.ts
```

## Directory Notes

- `src/store/editorStore.ts` composes slice creators into a single editor store.
- `src/store/slices/*` owns domain actions and local state transitions.
- `src/player/*` contains real-time playback internals separate from React rendering.
- `src/engine/*` contains export/proxy processing and FFmpeg interaction.
- `src/project/*` defines serializable project types and serializer helpers.
- `src/services/*` wraps API calls (`authService`, `projectService`, file cache).

## State Boundaries

The app deliberately keeps large binary objects outside serializable project state:

- `project` (serializable): tracks, clips, media metadata.
- `fileMap` (non-serializable): `Map<string, File>` used by player and engine.
- `proxyMap` (runtime): proxy status and URLs keyed by media id.

This keeps undo/redo and save/load fast while still enabling local file playback and in-browser rendering.

## Data Flow

### 1) Edit Flow

1. UI event dispatches an editor action.
2. Action mutates the relevant store slice.
3. Player reads updated timeline/project data and resynchronizes media.

### 2) Export Flow

1. `useExport` reads current `project` and `fileMap`.
2. `buildRenderJob` converts timeline clips into render segments.
3. `runExport` writes media files to FFmpeg FS, builds graph args, encodes, reads output, cleans up.
4. UI triggers browser download from generated blob URL.

### 3) Proxy Flow

1. Video import enqueues `generateProxy`.
2. Proxy engine transcodes to 640x360 MP4 (`-an`).
3. Store updates proxy status/URL.
4. Player resolves playback URL to proxy when ready.

## Current Architectural Decisions

- Slice-based store organization for maintainability.
- Dedicated proxy FFmpeg instance with serialized queue.
- Export orchestration separated from command construction.
- Route guards use both context state and cookie presence to avoid redirect flicker during bootstrap.
- Direct `/editor` route retained for development convenience.

## Risks and Follow-ups

- The direct `/editor` route bypasses auth guards and should be re-evaluated for production.
- Route fallback currently redirects all unknown paths to login; a dedicated not-found page may improve UX.
