# AloMedia Getting Started

## Prerequisites

- Node.js 18+
- npm 9+
- Modern browser with WebAssembly support

## Install and Run

1. Install dependencies:

```bash
npm install
```

2. Create `.env` in the project root:

```
VITE_BASE_URL=http://localhost:8080
```

3. Start development server:

```bash
npm run dev
```

4. Open the app (default Vite URL):

- Auth flow: `/auth/login`
- Editor by id (guarded): `/editor/:projectId`
- Direct editor route (dev/testing): `/editor`

## Available Scripts

- `npm run dev` - development server
- `npm run build` - typecheck/build
- `npm run preview` - preview production build
- `npm run lint` - ESLint

## First Editor Workflow

1. Import media in the media library.
2. Drag media onto tracks.
3. Edit clips (move/resize/split/configure).
4. Preview in the player.
5. Export from the editor toolbar.

## Architecture Reading Order

1. `ARCHITECTURE.md`
2. `DATA_MODEL.md`
3. `STATE_MANAGEMENT.md`
4. `PLAYER.md`
5. `FFMPEG.md`

## Production Header Requirement

FFmpeg.wasm requires cross-origin isolation. Configure these response headers in production:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```
