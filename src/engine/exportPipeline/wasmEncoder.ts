import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"
import type { RenderPlan, ExportPipelineCallbacks } from "./types"
import { buildFilterGraph } from "./filterGraphBuilder"
import { buildWasmCommand } from "./commandBuilder"
import { stageProgress } from "./progressTracker"
import { analyzeStreamCopyOpportunities } from "./streamCopyAnalyzer"
import { renderTextSegmentsToPngs } from "./textRenderer"

const CORE_MT_BASE_URL = new URL("/ffmpeg-core/", location.href).href

export class WasmEncoder {
  private ffmpeg: FFmpeg | null = null
  private isLoaded = false

  async load(): Promise<FFmpeg> {
    if (this.ffmpeg && this.isLoaded) return this.ffmpeg

    console.log("[WasmEncoder] Loading multi-threaded FFmpeg core from", CORE_MT_BASE_URL)

    this.ffmpeg = new FFmpeg()

    try {
      const loadPromise = this.ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_MT_BASE_URL}ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_MT_BASE_URL}ffmpeg-core.wasm`, "application/wasm"),
        workerURL: await toBlobURL(`${CORE_MT_BASE_URL}ffmpeg-core.worker.js`, "text/javascript"),
      })

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("FFmpeg WASM core load timeout (30s). Ensure core files exist at /ffmpeg-core/")), 30_000)
      })

      await Promise.race([loadPromise, timeoutPromise])
    } catch (err) {
      this.isLoaded = false
      this.ffmpeg = null
      const msg = err instanceof Error ? err.message : String(err)
      console.error("[WasmEncoder] Failed to load FFmpeg WASM core:", msg)
      throw new Error(
        `Failed to load FFmpeg WASM core. Ensure the multi-threaded core files exist at ${CORE_MT_BASE_URL}. Error: ${msg}`,
      )
    }

    console.log("[WasmEncoder] Multi-threaded core loaded.")
    this.isLoaded = true
    return this.ffmpeg
  }

  async execute(
    plan: RenderPlan,
    mediaFiles: Map<string, File>,
    callbacks: ExportPipelineCallbacks,
    abortSignal: AbortSignal,
  ): Promise<void> {
    const onProgress = callbacks.onProgress

    try {
      onProgress(stageProgress("probing", 3, 0, plan.estimatedTotalFrames))

      if (abortSignal.aborted) {
        callbacks.onError("Export cancelled")
        return
      }

      const ffmpeg = await this.load()

      if (abortSignal.aborted) {
        callbacks.onError("Export cancelled")
        return
      }

      onProgress(stageProgress("planning", 8, 0, plan.estimatedTotalFrames))

      const probeResults = new Map(plan.probeResults.map((p) => [p.mediaId, p]))

      let canStreamCopy = false
      try {
        const analysis = analyzeStreamCopyOpportunities(plan, probeResults)
        canStreamCopy = analysis.canStreamCopy
      } catch {
        canStreamCopy = false
      }

      onProgress(stageProgress("planning", 10, 0, plan.estimatedTotalFrames))

      const writtenFiles = new Set<string>()
      for (const [mediaId, file] of mediaFiles) {
        const fileName = plan.mediaFileNames.get(mediaId) ?? `media_${mediaId}.${file.name.split(".").pop() ?? "mp4"}`
        if (!writtenFiles.has(fileName)) {
          console.log("[WasmEncoder] Writing file to virtual FS:", fileName, `(${(file.size / 1024 / 1024).toFixed(1)} MB)`)
          await ffmpeg.writeFile(fileName, await fetchFile(file))
          writtenFiles.add(fileName)
        }
      }

      if (abortSignal.aborted) {
        await this.cleanupFiles(ffmpeg, writtenFiles)
        callbacks.onError("Export cancelled")
        return
      }

      onProgress(stageProgress("planning", 12, 0, plan.estimatedTotalFrames))

      const textSegments = plan.segments.filter((s) => s.type === "text")
      const textImageNames = new Map<string, string>()

      if (textSegments.length > 0) {
        const { width, height } = plan.outputTarget.resolution
        const textPngs = await renderTextSegmentsToPngs(textSegments, width, height)

        for (const [segId, blob] of textPngs) {
          const seg = textSegments.find((s) => s.id === segId)!
          const fileName = `text_${segId}.png`
          const data = new Uint8Array(await blob.arrayBuffer())
          await ffmpeg.writeFile(fileName, data)
          writtenFiles.add(fileName)

          const mediaId = seg.mediaId
          if (!plan.mediaFileNames.has(mediaId)) {
            plan.mediaFileNames.set(mediaId, fileName)
          }

          textImageNames.set(segId, fileName)
        }
      }

      const outputFileName = `output_${Date.now()}.${plan.outputTarget.format}`

      let command: string[]

      if (canStreamCopy && plan.streamCopySegments.length === 1) {
        const seg = plan.streamCopySegments[0]
        const inputName = plan.mediaFileNames.get(seg.mediaId) ?? `media_${seg.mediaId}.mp4`
        const duration = seg.mediaEnd - seg.mediaStart
        command = ["-y", "-ss", seg.mediaStart.toFixed(3), "-i", inputName, "-t", duration.toFixed(3), "-c", "copy", "-avoid_negative_ts", "make_zero"]
        if (plan.outputTarget.format === "mp4") {
          command.push("-movflags", "+faststart")
        }
        command.push(outputFileName)
        console.log("[WasmEncoder] Stream-copy fast path: single clip, no modifications")
      } else {
        const graph = buildFilterGraph(plan, probeResults, textImageNames)
        command = buildWasmCommand(graph, plan, outputFileName)
        console.log("[WasmEncoder] Full encode path. Filter graph length:", graph.filterComplex.length)
      }

      onProgress(stageProgress("encoding", 12, 0, plan.estimatedTotalFrames))

      let lastStderr = ""
      ffmpeg.on("log", ({ message }) => {
        lastStderr = message
      })

      if (abortSignal.aborted) {
        await this.cleanupFiles(ffmpeg, writtenFiles)
        callbacks.onError("Export cancelled")
        return
      }

      try {
        console.log("[WasmEncoder] Running FFmpeg command:", command.join(" "))
        const exitCode = await ffmpeg.exec(command)
        console.log("[WasmEncoder] FFmpeg exited with code:", exitCode)

        if (exitCode !== 0) {
          const errorDetail = lastStderr.slice(-300)
          console.error("[WasmEncoder] FFmpeg error output:", errorDetail)
          onProgress({
            stage: "failed",
            percent: 0,
            framesProcessed: 0,
            framesTotal: plan.estimatedTotalFrames,
            secondsRemaining: null,
            errorMessage: `FFmpeg exited with code ${exitCode}`,
          })
          callbacks.onError(`FFmpeg exited with code ${exitCode}`)
          await this.cleanupFiles(ffmpeg, writtenFiles)
          return
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown encoding error"
        console.error("[WasmEncoder] FFmpeg exec threw:", message)
        onProgress({
          stage: "failed",
          percent: 0,
          framesProcessed: 0,
          framesTotal: plan.estimatedTotalFrames,
          secondsRemaining: null,
          errorMessage: message,
        })
        callbacks.onError(message)
        await this.cleanupFiles(ffmpeg, writtenFiles)
        return
      }

      onProgress(stageProgress("finalizing", 96, plan.estimatedTotalFrames, plan.estimatedTotalFrames))

      const rawData = await ffmpeg.readFile(outputFileName) as Uint8Array
      const copy = new Uint8Array(rawData.length)
      copy.set(rawData)

      const mimeType = plan.outputTarget.format === "mp4" ? "video/mp4"
        : plan.outputTarget.format === "mov" ? "video/quicktime"
        : plan.outputTarget.format === "mkv" ? "video/x-matroska"
        : "video/x-msvideo"

      const blob = new Blob([copy], { type: mimeType })
      console.log("[WasmEncoder] Output file size:", (blob.size / 1024 / 1024).toFixed(1), "MB")

      onProgress(stageProgress("finalizing", 98, plan.estimatedTotalFrames, plan.estimatedTotalFrames))

      await ffmpeg.deleteFile(outputFileName).catch(() => {})
      await this.cleanupFiles(ffmpeg, writtenFiles)

      onProgress(stageProgress("done", 100, plan.estimatedTotalFrames, plan.estimatedTotalFrames))
      callbacks.onComplete(blob)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[WasmEncoder] Export failed:", message)
      onProgress({
        stage: "failed",
        percent: 0,
        framesProcessed: 0,
        framesTotal: plan.estimatedTotalFrames,
        secondsRemaining: null,
        errorMessage: message,
      })
      callbacks.onError(message)
    }
  }

  private async cleanupFiles(ffmpeg: FFmpeg, writtenFiles: Set<string>): Promise<void> {
    for (const fileName of writtenFiles) {
      await ffmpeg.deleteFile(fileName).catch(() => {})
    }
  }

  unload(): void {
    this.ffmpeg = null
    this.isLoaded = false
  }
}