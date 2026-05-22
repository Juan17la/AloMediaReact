import type { Project, ExportOutputFormat, ExportVideoCodec } from "../../project/projectTypes"
import type { EncodingPreset, ExportPipelineCallbacks, RenderPlan, MediaProbeResult } from "./types"
import { buildRenderPlan } from "./planBuilder"
import { analyzeStreamCopyOpportunities } from "./streamCopyAnalyzer"
import { executeWasmExport } from "./wasmEncoder"
import { executeServerExport } from "./serverEncoder"
import { selectEngine, type SelectedEngine } from "./engineRouter"
import { probeMediaFromProperties } from "./probe"
import { stageProgress } from "./progressTracker"

export type { EncodingPreset } from "./types"
export type { ExportPipelineProgress } from "./types"
export type { SelectedEngine } from "./engineRouter"

export interface ExportOptions {
  format: ExportOutputFormat
  codec: ExportVideoCodec
  resolution: { width: number; height: number }
  fps: number
  preset: EncodingPreset
  outputFileName: string
}

export interface ExportResult {
  success: boolean
  blob: Blob | null
  error: string | null
  engine: SelectedEngine
  plan: RenderPlan | null
}

export async function exportProject(
  project: Project,
  options: ExportOptions,
  mediaFiles: Map<string, File>,
  callbacks: ExportPipelineCallbacks,
  preferredEngine?: SelectedEngine,
  abortSignal?: AbortSignal,
): Promise<void> {
  const onProgress = callbacks.onProgress

  onProgress(stageProgress("probing", 1, 0, 0))

  // Build probe results from known media properties or file analysis
  const probeResults: MediaProbeResult[] = []
  const probeMap = new Map<string, MediaProbeResult>()

  for (const media of project.media) {
    const fileName = mediaFiles.get(media.id)?.name ?? `media_${media.id}.mp4`
    const probe = await probeMediaFromProperties(
      media.id,
      media.hash,
      fileName,
      {
        duration: media.duration ?? undefined,
      },
    )
    probeResults.push(probe)
    probeMap.set(media.id, probe)
  }

  onProgress(stageProgress("planning", 5, 0, 0))

  // Build the render plan
  const plan = buildRenderPlan(
    project,
    options.format,
    options.codec,
    options.resolution,
    options.fps,
    options.preset,
    probeResults,
    mediaFiles,
  )

  // Analyze stream copy opportunities
  const analysis = analyzeStreamCopyOpportunities(plan, probeMap)
  plan.canStreamCopy = analysis.canStreamCopy
  plan.streamCopySegments = analysis.segments

  plan.estimatedTotalFrames = Math.ceil(plan.projectDuration * options.fps)

  onProgress(stageProgress("planning", 10, 0, plan.estimatedTotalFrames))

  // Select engine
  const engine = preferredEngine ?? await selectEngine()

  console.log("[exportPipeline] Using engine:", engine, "Stream copy:", plan.canStreamCopy, "Segments:", plan.segments.length)

  onProgress(stageProgress("planning", 11, 0, plan.estimatedTotalFrames))

  // Use the provided abort signal (from useExport) or create a fallback
  const signal = abortSignal ?? new AbortController().signal

  if (signal.aborted) {
    callbacks.onError("Export cancelled")
    return
  }

  if (engine === "server") {
    await executeServerExport(plan, mediaFiles, callbacks, signal)
  } else {
    await executeWasmExport(plan, mediaFiles, callbacks, signal)
  }
}

export { checkServerAvailability, invalidateServerCache, wakeUpServer } from "./serverEncoder"
export { getEngineInfo } from "./engineRouter"
export { ENCODING_PRESETS, GPU_ENCODING_PRESETS } from "./encodingPresets"
export { buildOutputTarget, getFileExtension, getOutputMimeType } from "./encodingPresets"