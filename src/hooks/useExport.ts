import { useState, useRef } from "react"
import type { ExportProgress } from "../engine/exportProgress"
import type { ExportOptions } from "../engine/renderPipeline"

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

  async function startExport(_options: ExportOptions) {
    // Export feature has been removed.
    // This function intentionally does nothing so the UI button has no effect.
    return
  }

  return { startExport, cancelExport, resetExportState, progress, isExporting }
}
