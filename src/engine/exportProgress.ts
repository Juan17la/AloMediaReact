import type { JobStatus } from "./exportPipeline/types"

export interface ExportProgress {
  stage: JobStatus
  percent: number
  secondsRemaining: number | null
  errorMessage?: string
  framesProcessed?: number
  framesTotal?: number
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `~${m}m ${s}s`
}