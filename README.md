# AloMedia React

Browser-based non-linear video editor with multi-track timeline, real-time preview, and dual-engine export (FFmpeg.wasm client-side + server-side GPU/CPU fallback).

## Quick Start

1. **Understand the project in 15 minutes:** [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)
2. **Architecture and boundaries:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
3. **End-to-end editing workflow:** [docs/VIDEO_EDITOR_WORKFLOW.md](docs/VIDEO_EDITOR_WORKFLOW.md)
4. **Export and FFmpeg pipeline:** [docs/FFMPEG_EXPORT.md](docs/FFMPEG_EXPORT.md)
5. **Data structures catalog:** [docs/DATA_STRUCTURES.md](docs/DATA_STRUCTURES.md)

## Complete Documentation Index

| # | Document | Purpose |
|---|----------|---------|
| 1 | [PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md) | Master hub and reading guide |
| 2 | [GETTING_STARTED.md](docs/GETTING_STARTED.md) | Setup, workflow, first steps, golden rules |
| 3 | [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Five-layer architecture, data flow, decisions |
| 4 | [API_SERVICES.md](docs/API_SERVICES.md) | REST API, HTTP client, services, AI endpoints |
| 5 | [AUTHENTICATION.md](docs/AUTHENTICATION.md) | Session lifecycle, route protection, recovery |
| 6 | [VIDEO_EDITOR_WORKFLOW.md](docs/VIDEO_EDITOR_WORKFLOW.md) | Import, timeline, preview, export, save, share |
| 7 | [FFMPEG_EXPORT.md](docs/FFMPEG_EXPORT.md) | Dual-engine export, filter graph, progress |
| 8 | [UI_UX.md](docs/UI_UX.md) | Visual design, interactions, shortcuts, accessibility |
| 9 | [DATA_STRUCTURES.md](docs/DATA_STRUCTURES.md) | Arrays, stacks, maps, sets, graphs, records |
| 10 | [CONFIGURATION_RUNTIME.md](docs/CONFIGURATION_RUNTIME.md) | Build, deploy, env vars, IndexedDB, requirements |
| 11 | [QUALITY_RISKS.md](docs/QUALITY_RISKS.md) | Risks, limits, mitigation strategies, priorities |

## Documentation Principles

- Explains **behavior, responsibilities, dependencies, and design decisions** rather than copying code.
- File paths link to actual source files in the repository.
- Kept in sync with the codebase — update docs when architecture changes.
- Audience-specific reading paths for frontend devs, backend integrators, DevOps, and product.
