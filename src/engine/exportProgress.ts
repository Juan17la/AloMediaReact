export interface ExportProgress {
  stage: 'writing-files' | 'building-graph' | 'encoding' | 'reading-output' | 'cleanup' | 'done' | 'error'
  percent: number
  secondsRemaining: number | null
  errorMessage?: string
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `~${m}m ${s}s`
}
