import { useState, useRef, useCallback } from "react"
import type { ExportPipelineProgress, EncodingPreset, SelectedEngine } from "../engine/exportPipeline"
import {
  exportProject,
  checkServerAvailability,
  getEngineInfo,
  wakeUpServer,
} from "../engine/exportPipeline"
import type { ExportOutputFormat, ExportVideoCodec } from "../project/projectTypes"
import { useEditorStore, fileMap } from "../store/editorStore"

export interface UseExportOptions {
  format: ExportOutputFormat
  codec: ExportVideoCodec
  resolution: { width: number; height: number }
  fps: number
  preset: EncodingPreset
  outputFileName: string
}

export interface EngineInfo {
  engine: SelectedEngine
  label: string
  description: string
  gpuAccelerated: boolean
}

export interface UseExportReturn {
  startExport: (options: UseExportOptions) => void
  cancelExport: () => void
  resetExportState: () => boolean
  progress: ExportPipelineProgress | null
  isExporting: boolean
  engineInfo: EngineInfo | null
}

export function useExport(): UseExportReturn {
  const [progress, setProgress] = useState<ExportPipelineProgress | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [engineInfo, setEngineInfo] = useState<EngineInfo | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const cancelExport = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsExporting(false)
  }, [])

  const resetExportState = useCallback((): boolean => {
    if (abortControllerRef.current) return false
    setProgress(null)
    setIsExporting(false)
    setEngineInfo(null)
    return true
  }, [])

  const startExport = useCallback(async (options: UseExportOptions) => {
    if (abortControllerRef.current) return

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    setIsExporting(true)

    try {
      const project = useEditorStore.getState().project
      if (!project) {
        setProgress({
          stage: "failed",
          percent: 0,
          framesProcessed: 0,
          framesTotal: 0,
          secondsRemaining: null,
          errorMessage: "No project loaded",
        })
        setIsExporting(false)
        abortControllerRef.current = null
        return
      }

      const mediaFiles = new Map<string, File>()
      for (const media of project.media) {
        const file = fileMap.get(media.id)
        if (file) {
          mediaFiles.set(media.id, file)
          console.log(`[useExport] Found file for media ${media.id}: ${file.name}`)
        } else {
          console.warn(`[useExport] Missing file for media ${media.id} (${media.name})`)
        }
      }

      console.log(`[useExport] Collected ${mediaFiles.size} files out of ${project.media.length} media items`)
      if (mediaFiles.size === 0) {
        const errorMsg = "No media files found. Make sure to import videos/images before exporting."
        console.error("[useExport]", errorMsg)
        setProgress({
          stage: "failed",
          percent: 0,
          framesProcessed: 0,
          framesTotal: 0,
          secondsRemaining: null,
          errorMessage: errorMsg,
        })
        setIsExporting(false)
        abortControllerRef.current = null
        return
      }

      // Validate that all clips reference valid media
      const mediaIds = new Set(project.media.map(m => m.id))
      let clipsWithMissingMedia = 0
      for (const track of project.tracks) {
        for (const clip of track.clips) {
          if ("mediaId" in clip && clip.mediaId && !mediaIds.has(clip.mediaId)) {
            console.error(`[useExport] Clip ${clip.id} references missing media ${clip.mediaId}`)
            clipsWithMissingMedia++
          }
        }
      }

      if (clipsWithMissingMedia > 0) {
        const errorMsg = `${clipsWithMissingMedia} clip(s) reference media that no longer exists. Try reimporting media.`
        console.error("[useExport]", errorMsg)
        setProgress({
          stage: "failed",
          percent: 0,
          framesProcessed: 0,
          framesTotal: 0,
          secondsRemaining: null,
          errorMessage: errorMsg,
        })
        setIsExporting(false)
        abortControllerRef.current = null
        return
      }

      let capabilities = await checkServerAvailability()
      if (!capabilities.available) {
        const wokeUp = await wakeUpServer()
        if (wokeUp) {
          capabilities = await checkServerAvailability()
        }
      }
      const selectedEngine: SelectedEngine = capabilities.available ? "server" : "wasm"
      const info = getEngineInfo(selectedEngine, capabilities)
      setEngineInfo({
        engine: selectedEngine,
        ...info,
      })

      await exportProject(
        project,
        {
          format: options.format,
          codec: options.codec,
          resolution: options.resolution,
          fps: options.fps,
          preset: options.preset,
          outputFileName: options.outputFileName,
        },
        mediaFiles,
        {
          onProgress: setProgress,
          onComplete: (blob) => {
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = options.outputFileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            setProgress((prev) => ({
              stage: "done" as const,
              percent: 100,
              framesProcessed: prev?.framesTotal ?? 0,
              framesTotal: prev?.framesTotal ?? 0,
              secondsRemaining: null,
              errorMessage: null,
            }))
            setIsExporting(false)
            abortControllerRef.current = null
          },
          onError: (error) => {
            setProgress((prev) => ({
              stage: "failed" as const,
              percent: prev?.percent ?? 0,
              framesProcessed: prev?.framesProcessed ?? 0,
              framesTotal: prev?.framesTotal ?? 0,
              secondsRemaining: null,
              errorMessage: error,
            }))
            setIsExporting(false)
            abortControllerRef.current = null
          },
        },
        selectedEngine,
        abortController.signal,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed"
      console.error("[useExport] Uncaught error:", message)
      setProgress({
        stage: "failed",
        percent: 0,
        framesProcessed: 0,
        framesTotal: 0,
        secondsRemaining: null,
        errorMessage: message,
      })
      setIsExporting(false)
      abortControllerRef.current = null
    }
  }, [])

  return { startExport, cancelExport, resetExportState, progress, isExporting, engineInfo }
}