# AloMedia Documentation Index

This folder documents the current architecture of AloMedia as implemented in the `src` codebase.

## Start Here

| Document                                 | Purpose                                              |
| ---------------------------------------- | ---------------------------------------------------- |
| [GETTING_STARTED.md](GETTING_STARTED.md) | Local setup, required env vars, and first editor run |
| [CONFIGURATION.md](CONFIGURATION.md)     | Vite, TypeScript, ESLint, and deployment headers     |

## Architecture

| Document                                   | Purpose                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)         | High-level system structure, layer boundaries, and data flow           |
| [DATA_MODEL.md](DATA_MODEL.md)             | Core project and clip types used by store/player/engine                |
| [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) | Zustand slice-based store, history, and non-serializable runtime state |

## Editor Runtime

| Document                                     | Purpose                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| [PLAYER.md](PLAYER.md)                       | Real-time playback architecture and synchronization                    |
| [FFMPEG.md](FFMPEG.md)                       | Export pipeline (`buildRenderJob` -> `runExport`) and proxy generation |
| [VIDEO_EDITOR.md](VIDEO_EDITOR.md)           | Editor UX and page-level flow                                          |
| [EDITOR_COMPONENTS.md](EDITOR_COMPONENTS.md) | Component-level technical reference                                    |
| [HOOKS_AND_UTILS.md](HOOKS_AND_UTILS.md)     | Shared hooks and pure utility modules                                  |
| [STYLES_UI.md](STYLES_UI.md)                 | Theme tokens and styling conventions                                   |

## Auth and Routing

| Document                               | Purpose                                           |
| -------------------------------------- | ------------------------------------------------- |
| [AUTHENTICATION.md](AUTHENTICATION.md) | Cookie session model and `AuthProvider` lifecycle |
| [ROUTES.md](ROUTES.md)                 | Route tree, guards, and API client integration    |

## Architecture Snapshot

```
main.tsx
└── QueryClientProvider
    └── AuthProvider
        └── RouterProvider
            ├── /auth/* (PublicRoute)
            ├── /dashboard, /editor/:projectId (PrivateRoute)
            └── /editor (direct editor route for development)

Editor Page (VideoEditor)
├── Zustand store (slice-composed editor state)
├── Player subsystem (RAF + media sync)
└── Engine subsystem
    ├── renderPipeline.ts (Project -> RenderJob)
    ├── exportOrchestrator.ts (FFmpeg IO + progress stages)
    └── proxyEngine.ts (queued 640x360 proxies)
```
