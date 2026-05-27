# AloMedia Documentation Hub

This file serves as the master index for the comprehensive AloMedia video editor documentation.

## Project Overview

AloMedia is a browser-based non-linear video editor with multi-track timeline, real-time preview, local export via FFmpeg WebAssembly, and server-side export fallback. It supports video, audio, image, and text clips with transitions, color adjustments, transforms, and AI-powered audio tools.

## Main Documentation Files

1. **[README.md](../README.md)** — Quick onboarding map and role-based reading guide.
2. **[GETTING_STARTED.md](GETTING_STARTED.md)** — Setup, development workflow, first steps, and golden rules.
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** — Layered architecture, boundaries, data flow, and key design decisions.
4. **[API_SERVICES.md](API_SERVICES.md)** — HTTP client layer, REST API endpoints, services, errors, and AI media endpoints.
5. **[AUTHENTICATION.md](AUTHENTICATION.md)** — Session lifecycle, route protection, JWT cookies, password recovery.
6. **[VIDEO_EDITOR_WORKFLOW.md](VIDEO_EDITOR_WORKFLOW.md)** — End-to-end editor workflow: import, timeline, preview, export, save, share.
7. **[FFMPEG_EXPORT.md](FFMPEG_EXPORT.md)** — Export pipeline: dual-engine (WASM/server), filter graph, progress tracking, cancellation.
8. **[UI_UX.md](UI_UX.md)** — Visual structure, interaction patterns, accessibility, keyboard shortcuts, timeline usability.
9. **[DATA_STRUCTURES.md](DATA_STRUCTURES.md)** — Catalog of all data structures: arrays, stacks, maps, sets, sorted arrays, trees, records.
10. **[CONFIGURATION_RUNTIME.md](CONFIGURATION_RUNTIME.md)** — Build config, Vite, Tailwind v4, FFmpeg.wasm requirements, environment variables, IndexedDB cache.
11. **[QUALITY_RISKS.md](QUALITY_RISKS.md)** — Performance risks, temporal consistency, export reliability, product risks, technical debt, and mitigation strategies.

## Recommended Reading Order

### For New Contributors
1. GETTING_STARTED
2. ARCHITECTURE
3. VIDEO_EDITOR_WORKFLOW
4. DATA_STRUCTURES

### For Frontend Developers
1. ARCHITECTURE
2. VIDEO_EDITOR_WORKFLOW
3. DATA_STRUCTURES
4. UI_UX
5. FFMPEG_EXPORT

### For Backend Integrators
1. API_SERVICES
2. AUTHENTICATION
3. FFMPEG_EXPORT

### For DevOps / Deployment
1. CONFIGURATION_RUNTIME
2. QUALITY_RISKS
3. FFMPEG_EXPORT

### For Product / UX
1. UI_UX
2. VIDEO_EDITOR_WORKFLOW
3. QUALITY_RISKS

## Tech Stack at a Glance

| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript 5.9 |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS v4 |
| State Management | Zustand 5 (editor) + TanStack Query 5 (server) |
| Routing | React Router 7 |
| i18n | i18next + react-i18next |
| Icons | Lucide React |
| Video/Audio | HTML5 Media Elements + custom RAF loop |
| Export | FFmpeg.wasm (client) + REST server (fallback) |
| Local Cache | IndexedDB (file hash-based) |
| Cookies | js-cookie |
| Validation | Zod (implicit via TypeScript) |

## Application Pages

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Landing page |
| `/about` | Public | About AloMedia |
| `/contact` | Public | Contact page |
| `/help` | Public | Help center |
| `/legal/terms` | Public | Terms of service |
| `/legal/privacy` | Public | Privacy policy |
| `/auth/login` | Public (redirects if auth) | Login |
| `/auth/register` | Public (redirects if auth) | Register |
| `/auth/recover` | Public | Password reset |
| `/auth/recover/request` | Public | Request password recovery |
| `/dashboard` | Private | Project dashboard |
| `/editor/:projectId` | Private | Video editor |
| `/editor` | Public* | Video editor (standalone) |
| `/profile` | Private | User profile |
| `/admin` | Admin only | Admin dashboard |
| `*` | Public | 404 Not Found |

> *Note: `/editor` without projectId is currently public for testing. Set to private for production.

## Documentation Principles

- Every document explains **behavior, responsibilities, dependencies, and design decisions** rather than copying code.
- File paths are relative to the repository root and link to actual source files.
- Documentation is kept in sync with the codebase — if you change architecture, update these files.
- When adding new major features, add a new section to the relevant document or create a new one and link it here.
