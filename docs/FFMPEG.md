# AloMedia Engine and FFmpeg Pipeline

## Overview

The engine subsystem runs entirely in the browser and is split into separate modules for orchestration, graph construction, and FFmpeg lifecycle management.

## Engine Modules

- `src/engine/ffmpegEngine.ts`: shared export FFmpeg instance (`loadFFmpeg`, `getFFmpeg`, `execFFmpeg`).
- `src/engine/renderPipeline.ts`: converts project timeline data into `RenderJob` segments.
- `src/engine/filterGraphBuilder.ts`: builds FFmpeg filter graph pieces from render segments.
- `src/engine/exportOrchestrator.ts`: writes files, executes FFmpeg, reports progress, performs cleanup.
- `src/engine/proxyEngine.ts`: dedicated FFmpeg instance for proxy transcoding with serialized queue.

## Export Flow

The export flow is triggered by `src/hooks/useExport.ts`:

1. Read `project` from store and `fileMap` from editor store module.
2. Build a `RenderJob` via `buildRenderJob(project, fileMap, options)`.
3. Ensure FFmpeg is loaded (`loadFFmpeg`).
4. Run orchestrated export with cancellation support (`runExport`).
5. Convert output bytes into blob URL and trigger browser download.

## Render Job Construction

`buildRenderJob` walks tracks/clips and converts each clip into a render segment with:

- Source mapping (`mediaId`, `mediaStart`, `mediaEnd`).
- Timeline placement (`timelineStart`, `timelineEnd`).
- Clip type (`video`, `audio`, `image`; text clips are skipped).
- Optional transform/color/audio config metadata.

Clips with missing files in `fileMap` are skipped with a warning.

## Orchestrator Stages

`runExport` reports progress in explicit stages:

1. `writing-files`
2. `building-graph`
3. `encoding`
4. `reading-output`
5. `cleanup`
6. `done`

It also supports cancellation through `AbortSignal` and cleans virtual files in success and failure paths.

## Command Assembly

The execution command is assembled from the graph:

- Base canvas args.
- Media inputs (`-i`), with `-loop 1` for images.
- `-filter_complex` when required.
- Stream maps for video/audio outputs.
- Codec selection by output format:
  - MP4: `libx264` + `aac`
  - WebM: `libvpx-vp9` + `libopus`

## Proxy Pipeline

`proxyEngine.ts` runs on a separate FFmpeg instance and processes jobs sequentially:

- Input: imported source video file.
- Output: `640x360` MP4 proxy, `-crf 28`, `-preset fast`, audio removed (`-an`).
- Result: object URL passed to store callbacks.

The serialized promise queue prevents concurrent proxy operations from colliding on a single FFmpeg instance.

## Browser Requirements

FFmpeg.wasm multi-threading requires `SharedArrayBuffer`, so responses must include:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

These headers are configured in `vite.config.ts` for development and must be preserved in production hosting.
