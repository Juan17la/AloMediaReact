# AloMedia Configuration

## Build and Tooling

### Vite (`vite.config.ts`)

Configured plugins:

- `@vitejs/plugin-react`
- `@tailwindcss/vite`

Key settings:

- Dev server headers for `SharedArrayBuffer`:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
- Dependency optimization excludes:
  - `@ffmpeg/ffmpeg`
  - `@ffmpeg/util`

### TypeScript

- Project references in `tsconfig.json` to:
  - `tsconfig.app.json`
  - `tsconfig.node.json`

Build command uses TypeScript build mode:

```bash
tsc -b
```

### ESLint

Lint entrypoint: `eslint.config.js`

Run checks with:

```bash
npm run lint
```

## Environment Variables

HTTP API base URL used by `src/api/http.ts`:

```
VITE_BASE_URL=http://localhost:8080
```

All frontend-exposed environment variables must use the `VITE_` prefix.

## Package Scripts

From `package.json`:

- `dev`: `vite`
- `build`: `tsc -b && vite build`
- `lint`: `eslint .`
- `preview`: `vite preview`

## Deployment

Ensure production hosting preserves cross-origin isolation headers required by FFmpeg.wasm:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

`vercel.json` should be kept aligned with these requirements for Vercel deployments.
