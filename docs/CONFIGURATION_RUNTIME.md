# Configuration and Runtime

## Objective

Document all configuration decisions that impact build, development, local execution, and deployment of the AloMedia video editor.

---

## Build and Bundling

**Tool:** Vite 7 with `@vitejs/plugin-react`

### Why Vite

- Fast dev server startup (native ESM, no bundling during dev)
- Efficient Hot Module Replacement (HMR) for UI iteration
- Modern TypeScript support out of the box
- Optimized production builds with Rollup

### Build Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Start development server |
| `prebuild` | `node scripts/copy-ffmpeg-core.cjs` | Copy FFmpeg core files to `public/` |
| `build` | `tsc -b && vite build` | Type-check and production build |
| `lint` | `eslint .` | Run ESLint |
| `preview` | `vite preview` | Preview production build locally |
| `postinstall` | `node scripts/copy-ffmpeg-core.cjs` | Copy FFmpeg cores after npm install |

### FFmpeg Core Copy Script

**File:** `scripts/copy-ffmpeg-core.cjs`

Copies `@ffmpeg/core` and `@ffmpeg/core-mt` WASM/JS files into `public/ffmpeg-core/` and `public/ffmpeg-core-st/`. This ensures the files are served as static assets.

| Directory | Core Type | Usage |
|-----------|-----------|-------|
| `public/ffmpeg-core/` | Multi-threaded | Export engine |
| `public/ffmpeg-core-st/` | Single-threaded | Proxy generation |

---

## Styles and Design Tokens

**System:** Tailwind CSS v4

### Configuration

Tailwind v4 uses CSS-based configuration rather than `tailwind.config.js`. The project uses:
- `@tailwindcss/vite` plugin for Vite integration
- CSS variables for theme tokens in `src/index.css`
- Semantic color naming: `bg-dark-base`, `text-on-surface`, `border-dark-border`, etc.

### Theme System

Two themes are supported:
- **Dark mode** (default) — Optimized for long editing sessions
- **Light mode** — Available via theme toggle

Theme switching is handled by `ThemeProvider` (`src/context/ThemeProvider.tsx`) which toggles a CSS class on the document root and persists preference to `localStorage`.

### Custom Components

Reusable UI primitives in `src/components/ui/`:
- `Dropdown.tsx` — Custom select with keyboard navigation
- `RangeSlider.tsx` — Dual-handle range input
- `InspectorSliderRow.tsx` — Labeled slider for inspector panel
- `IconButton.tsx` / `LabelButton.tsx` — Button variants

---

## React Query (TanStack Query)

**File:** Configured in app entry point

### Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,           // Don't retry failed queries automatically
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})
```

### Usage

- **Dashboard:** `useQuery` for project lists, `useMutation` for create/update/delete
- **Auth:** `useQuery` for `me()` on app mount
- **No query caching for editor** — Editor state lives in Zustand, not React Query

---

## FFmpeg.wasm Runtime Requirements

### Cross-Origin Isolation

For FFmpeg.wasm multi-threaded core to work, the page must be cross-origin isolated:

**Required Headers:**
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

**Vite Dev Config:**
```typescript
server: {
  headers: {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
  }
}
```

**Production:** Ensure your hosting provider (Vercel, Netlify, etc.) sets these headers.

### SharedArrayBuffer

COOP/COEP enable `SharedArrayBuffer`, which is required for:
- Multi-threaded FFmpeg.wasm (`@ffmpeg/core-mt`)
- Proxy generation and export encoding

### Browser Compatibility

| Feature | Requirement |
|---------|-------------|
| WebAssembly | Required for FFmpeg.wasm |
| SharedArrayBuffer | Required for multi-threaded encoding |
| Service Worker | Optional (for offline support, future) |
| File System Access API | Optional (for direct file saving, future) |

### Memory Considerations

- WASM virtual filesystem holds all input media + output file in memory simultaneously.
- Large projects may require 2-4GB of available RAM.
- 32-bit browsers/processes may hit ~2GB limits.
- Recommend 64-bit Chrome/Edge/Firefox for large exports.

---

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` / `react-dom` | ^19.2.0 | UI framework |
| `zustand` | ^5.0.11 | State management |
| `@tanstack/react-query` | ^5.90.21 | Server data fetching |
| `react-router` | ^7.13.1 | Client-side routing |
| `tailwindcss` | ^4.2.1 | Utility CSS |
| `@tailwindcss/vite` | ^4.2.1 | Tailwind Vite integration |
| `i18next` / `react-i18next` | ^26 / ^17 | Internationalization |
| `i18next-browser-languagedetector` | ^8.2.1 | Auto language detection |
| `lucide-react` | ^0.544.0 | Icon library |
| `js-cookie` | ^3.0.5 | Cookie management |
| `crypto-js` | ^4.2.0 | SHA-256 hashing for file deduplication |
| `@ffmpeg/ffmpeg` | ^0.12.15 | FFmpeg WASM bindings |
| `@ffmpeg/core` / `@ffmpeg/core-mt` | ^0.12.10 | FFmpeg WASM binaries |
| `@ffmpeg/util` | ^0.12.2 | FFmpeg utilities |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ~5.9.3 | Type system |
| `vite` | ^7.3.1 | Build tool |
| `@vitejs/plugin-react` | ^5.1.1 | React Vite plugin |
| `eslint` | ^9.39.1 | Linting |
| `typescript-eslint` | ^8.48.0 | TypeScript ESLint rules |
| `globals` | ^16.5.0 | ESLint globals |

---

## Environment Variables

| Variable | Required | Default | Used By | Description |
|----------|----------|---------|---------|-------------|
| `VITE_BASE_URL` | Yes | — | `api/http.ts`, `api/aiMedia.ts` | Backend API base URL |
| `VITE_EXPORT_SERVER_URL` | No | `""` | `engine/exportPipeline/serverEncoder.ts` | Export server base URL |

### Environment File Examples

**Development (`.env`):**
```env
VITE_BASE_URL=http://localhost:8080
VITE_EXPORT_SERVER_URL=http://localhost:3000
```

**Production (`.env.production`):**
```env
VITE_BASE_URL=https://api.alomedia.app
VITE_EXPORT_SERVER_URL=https://export.alomedia.app
```

### Security Note

All `VITE_` prefixed variables are embedded in the client bundle at build time. Do NOT put secrets in these variables. The JWT token is handled via cookies, not env vars.

---

## Local Persistence

### IndexedDB File Cache

**File:** `src/services/fileCacheService.ts`

- Database name: `alomedia-file-cache`
- Store name: `files`
- Key: `media.hash` (SHA-256 hex)
- Value: `{ hash, blob, name, type, lastAccessed }`
- TTL: 30 days from last access

### Cache Lifecycle

1. **Import:** File is hashed and saved to IndexedDB
2. **Project Load:** Files are resolved from IndexedDB by hash
3. **Access:** `lastAccessed` is updated on read to extend TTL
4. **Eviction:** `evictExpiredEntries()` removes entries older than 30 days. Should be called once on app start.

### Limitations

- Cache is browser- and device-specific
- Clearing browser storage (DevTools -> Application -> Clear storage) removes it
- A modified file has a different hash and will not match
- No explicit size limit; browser quota applies

---

## Deployment Considerations

### Static Hosting

AloMedia is a static SPA. It can be deployed to:
- Vercel (recommended, config included)
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Any static file server

### Required Headers

For full functionality (FFmpeg.wasm export), the server must send:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

For Vercel, these are configured in `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

### Asset Size

| Asset | Approximate Size | Notes |
|-------|------------------|-------|
| JS bundle | ~500KB-1MB | Depends on tree-shaking |
| FFmpeg WASM core | ~25MB | Multi-threaded core |
| FFmpeg WASM worker | ~100KB | Web Worker for MT |
| Total initial load | ~26MB | With FFmpeg cores |

**Optimization:**
- FFmpeg cores are loaded on-demand (only when export or proxy generation is triggered)
- The main app bundle does not include FFmpeg
- Lazy load editor page to reduce initial landing page size

### Export Server

If using server-side export:
- Deploy export server separately (e.g., Railway, Fly.io, AWS ECS)
- Ensure server has sufficient disk space for temporary upload storage
- Configure CORS to allow requests from the frontend domain
- Consider rate limiting and max upload size

---

## Monitoring and Observability

### Console Logging

The codebase uses structured console logging in key areas:
- Export pipeline: `[exportEngine]`, `[serverEncoder]`, `[useExport]`
- Player: frame-level logging is suppressed in production
- Project serialization: `[projectSerializer]`

### Future Improvements

1. **Error tracking** — Integrate Sentry or similar for production error reporting
2. **Performance metrics** — Track export duration, player frame drops, memory usage
3. **Analytics** — Feature usage tracking (opt-in) to guide product decisions
4. **Health checks** — Automated health check for export server integration

---

## Files Reference

| File | Responsibility |
|------|----------------|
| `vite.config.ts` | Vite configuration, plugins, dev server headers |
| `vercel.json` | Vercel deployment headers and routing |
| `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` | TypeScript configuration |
| `eslint.config.js` | ESLint rules and parser options |
| `scripts/copy-ffmpeg-core.cjs` | Copies FFmpeg WASM binaries to public directory |
| `src/config/i18n.ts` | i18next initialization and resource loading |
| `src/index.css` | Global styles, Tailwind imports, CSS variables |
| `src/services/fileCacheService.ts` | IndexedDB file cache implementation |
