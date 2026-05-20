import type { ExportPipelineProgress, JobStatus } from "./types"

const FRAME_REGEX = /frame=\s*(\d+)/
const FPS_REGEX = /fps=\s*([\d.]+)/
const TIME_REGEX = /time=\s*([\d:.]+)/
const SIZE_REGEX = /size=\s*(\d+\w+)/
const BITRATE_REGEX = /bitrate=\s*([\d.]+\w+\/s)/

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":")
  if (parts.length !== 3) return 0
  const hours = parseFloat(parts[0])
  const minutes = parseFloat(parts[1])
  const seconds = parseFloat(parts[2])
  return hours * 3600 + minutes * 60 + seconds
}

export interface ParsedProgress {
  framesProcessed: number
  currentFps: number
  currentTimeSeconds: number
  size: string | null
  bitrate: string | null
}

export function parseFfmpegStderr(stderr: string): ParsedProgress | null {
  const lines = stderr.split("\n")
  let lastProgressLine: string | null = null

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim()
    if (FRAME_REGEX.test(line)) {
      lastProgressLine = line
      break
    }
  }

  if (!lastProgressLine) return null

  const frameMatch = lastProgressLine.match(FRAME_REGEX)
  const fpsMatch = lastProgressLine.match(FPS_REGEX)
  const timeMatch = lastProgressLine.match(TIME_REGEX)
  const sizeMatch = lastProgressLine.match(SIZE_REGEX)
  const bitrateMatch = lastProgressLine.match(BITRATE_REGEX)

  if (!frameMatch) return null

  return {
    framesProcessed: parseInt(frameMatch[1], 10) || 0,
    currentFps: fpsMatch ? parseFloat(fpsMatch[1]) : 0,
    currentTimeSeconds: timeMatch ? parseTimeToSeconds(timeMatch[1]) : 0,
    size: sizeMatch ? sizeMatch[1] : null,
    bitrate: bitrateMatch ? bitrateMatch[1] : null,
  }
}

export function computeProgress(
  parsed: ParsedProgress | null,
  totalFrames: number,
  totalDurationSeconds: number,
  stage: JobStatus,
): ExportPipelineProgress {
  if (!parsed) {
    const stagePercents: Record<string, number> = {
      pending: 0,
      probing: 5,
      planning: 10,
    }
    return {
      stage,
      percent: stagePercents[stage] ?? 0,
      framesProcessed: 0,
      framesTotal: totalFrames,
      secondsRemaining: null,
      errorMessage: null,
    }
  }

  const percentComplete = totalFrames > 0
    ? Math.min(95, Math.round((parsed.framesProcessed / totalFrames) * 88) + 12)
    : Math.min(95, Math.round((parsed.currentTimeSeconds / totalDurationSeconds) * 88) + 12)

  const secondsRemaining = parsed.currentFps > 0
    ? Math.ceil((totalFrames - parsed.framesProcessed) / parsed.currentFps)
    : null

  return {
    stage,
    percent: percentComplete,
    framesProcessed: parsed.framesProcessed,
    framesTotal: totalFrames,
    secondsRemaining,
    errorMessage: null,
  }
}

export function stageProgress(stage: JobStatus, percent: number, framesProcessed: number, framesTotal: number): ExportPipelineProgress {
  return {
    stage,
    percent,
    framesProcessed,
    framesTotal,
    secondsRemaining: null,
    errorMessage: null,
  }
}