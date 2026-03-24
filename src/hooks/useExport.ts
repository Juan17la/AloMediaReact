import { useState, useRef } from "react"
import { useEditorStore, fileMap } from "../store/editorStore"
import { buildRenderJob } from "../engine/renderPipeline"
import type { ExportOptions } from "../engine/renderPipeline"
import { loadFFmpeg, getFFmpeg } from "../engine/ffmpegEngine"
import { runExport } from "../engine/exportOrchestrator"
import type { ExportProgress } from "../engine/exportProgress"
import { isFfmpegTerminateError } from "../engine/ffmpegUtils"

export interface UseExportReturn {
  startExport: (options: ExportOptions) => void
  cancelExport: () => void
  resetExportState: () => boolean
  progress: ExportProgress | null
  isExporting: boolean
}

export function useExport(): UseExportReturn {
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  function cancelExport() {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsExporting(false)
  }

  function resetExportState(): boolean {
    // Keep reset non-destructive: callers should cancel active exports explicitly.
    if (abortControllerRef.current) return false
    setProgress(null)
    setIsExporting(false)
    return true
  }

  async function startExport(options: ExportOptions) {
    if (isExporting) return

    // Clear stale terminal state from a previous export session.
    setProgress(null)

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsExporting(true)
    setProgress({ stage: 'writing-files', percent: 0, secondsRemaining: null })

    try {
      const project = useEditorStore.getState().project
      const job = buildRenderJob(project, fileMap, options)

      await loadFFmpeg()
      const ffmpeg = getFFmpeg()

      const output = await runExport(ffmpeg, job, fileMap, setProgress, controller.signal)

      const mimeType = options.outputFormat === 'webm' ? 'video/webm' : 'video/mp4'
      const safeData = new Uint8Array(output)
      const blob = new Blob([safeData], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = options.outputFileName
      a.click()

      // Keep blob URL alive long enough for slow browsers/large downloads.
      setTimeout(() => URL.revokeObjectURL(url), 300_000)
    } catch (err) {
      if ((err instanceof DOMException && err.name === 'AbortError') || isFfmpegTerminateError(err)) {
        // setProgress({ stage: 'error', percent: 0, secondsRemaining: null, errorMessage: 'Export cancelled' })
        setProgress(null)
      } else {
        const msg = err instanceof Error ? err.message : String(err)
        setProgress({ stage: 'error', percent: 0, secondsRemaining: null, errorMessage: msg })
      }
    } finally {
      setIsExporting(false)
      abortControllerRef.current = null
    }
  }

  return { startExport, cancelExport, resetExportState, progress, isExporting }
}
