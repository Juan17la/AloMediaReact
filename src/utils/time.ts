import type { RefObject } from "react"
import type { Clip, Track } from "../project/projectTypes"
import { DEFAULT_PIXELS_PER_SECOND, GRID_INTERVALS_SECONDS } from "../constants/timeline"
import { DEFAULT_SPEED } from "../constants/speed"

// Width of the track header column — must be consistent across Track, Timeline, PlayheadBar
export const TRACK_HEADER_WIDTH = 120

export function getProjectDuration(tracks: Track[] | undefined | null): number {
  if (!Array.isArray(tracks) || tracks.length === 0) return 0
  const ends = tracks.flatMap(t => (t.clips ?? []).map(c => c.timelineEnd))
  return ends.length === 0 ? 0 : Math.max(0, ...ends)
}

export function formatTimecode(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  return [hours, minutes, secs].map(v => String(v).padStart(2, "0")).join(":")
}

export function selectGridInterval(pixelsPerSecond: number): number {
  // Keep default view minute-oriented while allowing coarse intervals when zoomed out.
  const minimumSpacingPx = pixelsPerSecond <= 2 ? 300 : 500

  if (Math.abs(pixelsPerSecond - DEFAULT_PIXELS_PER_SECOND) < 0.001) {
    return 60
  }

  for (const interval of GRID_INTERVALS_SECONDS) {
    if (interval * pixelsPerSecond >= minimumSpacingPx) {
      return interval
    }
  }
  return 3600
}

export function pxToTime(px: number, scale: number): number {
  return px / scale
}

export function timeToPx(time: number, scale: number): number {
  return time * scale
}

export function getMediaBackedClipMaxTimelineEnd(clip: Clip): number | null {
  if (!("mediaStart" in clip) || !("mediaEnd" in clip)) return null

  const baseDuration = clip.mediaEnd - clip.mediaStart
  const speed = clip.speed ?? DEFAULT_SPEED
  const maxDuration = baseDuration / speed

  return toSeconds(toMs(clip.timelineStart + maxDuration))
}

export function clientXToTime(
  clientX: number,
  rulerRef: RefObject<HTMLDivElement | null>,
  scrollLeft: number,
  pixelsPerSecond: number
): number {
  if (!rulerRef.current) return 0
  const rect = rulerRef.current.getBoundingClientRect()
  const pixelOffset = clientX - rect.left + scrollLeft
  return Math.max(0, pixelOffset / pixelsPerSecond)
}

/** 1-millisecond tolerance used when matching clip boundaries — prevents float drift from hiding clips. */
export const CLIP_EPSILON = 0.001

/** Round a seconds value to the nearest millisecond, eliminating sub-ms float accumulation. */
export const toMs = (seconds: number): number => Math.round(seconds * 1000)

/** Convert an integer millisecond value back to seconds. */
export const toSeconds = (ms: number): number => ms / 1000
