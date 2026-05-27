# FFmpeg Export Pipeline

## Objective

Convert an editable timeline project into a downloadable video file entirely within the browser (with optional server-side acceleration).

## Principle

The export process does not consume React components. It operates on a **render plan** — a pure data structure derived from the project state. This separation means export can run while the user continues to edit, preview, or navigate away (though the UI typically shows a blocking progress modal).

## Dual-Engine Architecture

AloMedia supports two export engines:

| Engine | Location | Pros | Cons |
|--------|----------|------|------|
| **Browser (WASM)** | Client | No server needed, private, works offline | Slower, memory-intensive, requires COOP/COEP |
| **Server** | Remote (Railway) | Fast, GPU-accelerated option, handles large files | Requires upload bandwidth, server availability, internet |

**Engine selection** (`src/engine/exportPipeline/engineRouter.ts`):
1. Check server health at `/api/health`
2. If available, prefer server
3. If unavailable or user forces WASM, use client-side
4. `wakeUpServer()` retries with exponential backoff for cold-start services

---

## Export Lifecycle

### Phase 1: Probing

**File:** `src/engine/exportPipeline/probe.ts`

For each media asset in the project:
- Derive codec, resolution, FPS, duration, audio properties from known metadata
- If metadata is incomplete, probe via temporary media element or file header analysis
- Results stored in `MediaProbeResult[]`

### Phase 2: Planning

**File:** `src/engine/exportPipeline/planBuilder.ts`

Converts `Project` + `ExportOptions` into a `RenderPlan`:

1. Iterate all tracks and clips in timeline order
2. Convert each clip to a `RenderSegment` with resolved transitions
3. Exclude non-exportable segments (e.g., placeholder clips)
4. Calculate total project duration
5. Attach output parameters (format, codec, resolution, FPS, preset)
6. Build `mediaFileNames` map for virtual filesystem naming

### Phase 3: Stream Copy Analysis

**File:** `src/engine/exportPipeline/streamCopyAnalyzer.ts`

Detects fast-path opportunities:
- If the project contains a single video clip with no modifications (no transforms, no color adjustments, no transitions, no speed change)
- And the output format/codec matches the source
- Then export can use `-c copy` instead of re-encoding
- This bypasses the filter graph entirely and is orders of magnitude faster

### Phase 4: Filter Graph Construction

**File:** `src/engine/exportPipeline/filterGraphBuilder.ts`

For complex projects, builds an FFmpeg `-filter_complex` string:

#### Video Pipeline
1. **Canvas synthesis** — Create a base canvas at output resolution
2. **Per-segment filters** — For each visual segment:
   - `trim` / `setpts` — Extract sub-range and adjust timestamps
   - `scale` — Fit to output resolution
   - `eq` / `colorbalance` — Apply color adjustments
   - `rotate` / `overlay` — Apply transform and position
3. **Layer composition** — Overlay visual segments by track order (bottom-to-top)
4. **Transitions** — `xfade` filter for crossfades between clips

#### Audio Pipeline
1. **Per-segment filters** — For each audio segment:
   - `atrim` — Extract sub-range
   - `atempo` — Speed adjustment
   - `volume` / `afade` — Volume and fade
   - `pan` — Balance (stereo positioning)
2. **Delay and mix** — `adelay` each track to its timeline start, then `amix` all tracks

#### Text Overlay
- Text clips are rendered to PNG images via `textRenderer.ts`
- PNGs are written to the virtual filesystem and overlaid with `movie` + `overlay`

### Phase 5: Encoding

#### WASM Path

**File:** `src/engine/exportPipeline/wasmEncoder.ts`

1. Load FFmpeg.wasm multi-threaded core from `/ffmpeg-core/`
2. Write all media files to the virtual filesystem (deduplicated by filename)
3. Write rendered text PNGs
4. Build FFmpeg command array from filter graph
5. Execute `ffmpeg.exec(command)`
6. Listen to stderr for progress estimation
7. Read output file from virtual FS as `Uint8Array`
8. Convert to `Blob` with correct MIME type
9. Clean up virtual FS files
10. Trigger download via object URL

#### Server Path

**File:** `src/engine/exportPipeline/serverEncoder.ts`

1. Wake up server (handle cold-start)
2. Build `FormData` with:
   - `plan` field: JSON-serialized `RenderPlan`
   - `file_{mediaId}` fields: actual media `File` objects
3. POST to `/api/export`
4. Receive `jobId`
5. Poll `/api/export/{jobId}/status` every 500ms
6. On `done`, GET `/api/export/{jobId}/download` as blob
7. Trigger download
8. On cancellation, DELETE `/api/export/{jobId}`

### Phase 6: Progress Tracking

**File:** `src/engine/exportPipeline/progressTracker.ts`

Progress is reported as:
```typescript
interface ExportPipelineProgress {
  stage: JobStatus           // "probing" | "planning" | "encoding" | ...
  percent: number            // 0-100
  framesProcessed: number
  framesTotal: number
  secondsRemaining: number | null
  errorMessage: string | null
}
```

For WASM encoding, progress is estimated from FFmpeg stderr output (frame counters, timecodes). For server encoding, progress comes from the server's status endpoint.

---

## Cancellation

Export supports abort at any phase:

1. User clicks "Cancel" in the export modal
2. `AbortController.abort()` is called
3. **WASM:** FFmpeg process is terminated (if running), virtual FS cleaned up
4. **Server:** DELETE request sent to cancel endpoint
5. UI resets to idle state

---

## Resilience

### Audio Stream Fallback

If the first export attempt fails due to audio stream incompatibilities:
1. The error is caught in `useExport.ts`
2. A fallback render plan is built with audio re-encoding forced
3. One automatic retry is attempted
4. If it fails again, structured error is shown to the user

### Server Unavailability

If the export server is down:
1. `checkServerAvailability()` returns `available: false`
2. `wakeUpServer()` attempts to cold-start (Railway free tier behavior)
3. If still unavailable, automatically falls back to WASM
4. User can also manually select WASM in the export modal

---

## Output Profiles

**File:** `src/engine/exportPipeline/encodingPresets.ts`

| Format | Video Codec | Audio Codec | Container | MIME Type |
|--------|-------------|-------------|-----------|-----------|
| MP4 | H.264 / VP9 / AV1 | AAC | MP4 | `video/mp4` |
| MOV | H.264 / VP9 / AV1 | AAC | QuickTime | `video/quicktime` |
| MKV | H.264 / VP9 / AV1 | AAC | Matroska | `video/x-matroska` |
| AVI | H.264 / VP9 / AV1 | AAC | AVI | `video/x-msvideo` |

### Encoding Presets

- `fast` — Lower quality, fastest encoding. Good for drafts.
- `medium` — Balanced quality/speed. Default.
- `slow` — Best quality, slowest encoding. Good for final delivery.

### GPU Acceleration

When server export is available with GPU:
- `gpuAccel: true` and `gpuCodec` indicate hardware codec (e.g., `h264_nvenc`)
- Server uses hardware encoding for dramatically faster exports
- Client has no GPU acceleration (WASM is CPU-only)

---

## Preview vs Export Differences

| Aspect | Preview | Export |
|--------|---------|--------|
| Video decoding | Browser native `<video>` | FFmpeg libavcodec |
| Color adjustments | CSS `filter` | FFmpeg `eq` / `colorbalance` |
| Transitions | CSS opacity/transform | FFmpeg `xfade` |
| Text rendering | DOM/CSS | PNG overlay |
| Audio | Web Audio / HTML Audio | FFmpeg audio filters |
| Transform | CSS `transform` | FFmpeg `overlay` + `rotate` |

Results are visually close but not pixel-identical. Color calibration may vary slightly between CSS and FFmpeg filter implementations.

---

## Environment Requirements

For stable FFmpeg.wasm execution:

1. **COOP/COEP headers** — Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy must be enabled. Vite dev server is configured for this.
2. **SharedArrayBuffer** — Required for multi-threaded FFmpeg.wasm. Enabled by COOP/COEP.
3. **WebAssembly** — Modern browser support required.
4. **Memory** — Large projects may require significant RAM for virtual filesystem + encoding.

---

## Files Reference

| File | Responsibility |
|------|----------------|
| `src/engine/exportPipeline/index.ts` | Main export orchestrator |
| `src/engine/exportPipeline/engineRouter.ts` | Engine selection logic |
| `src/engine/exportPipeline/planBuilder.ts` | Render plan construction |
| `src/engine/exportPipeline/filterGraphBuilder.ts` | FFmpeg filter complex generation |
| `src/engine/exportPipeline/commandBuilder.ts` | WASM CLI argument builder |
| `src/engine/exportPipeline/streamCopyAnalyzer.ts` | Fast-path detection |
| `src/engine/exportPipeline/progressTracker.ts` | Progress estimation |
| `src/engine/exportPipeline/textRenderer.ts` | Text-to-PNG rendering |
| `src/engine/exportPipeline/probe.ts` | Media property probing |
| `src/engine/exportPipeline/wasmEncoder.ts` | Client-side FFmpeg execution |
| `src/engine/exportPipeline/serverEncoder.ts` | Server-side export client |
| `src/engine/exportPipeline/encodingPresets.ts` | Output format definitions |
| `src/hooks/useExport.ts` | React hook for export UI integration |
| `src/components/editor/ExportModal.tsx` | Export UI modal |
