import { toMs, toSeconds } from "../../utils/time"
import { validateMediaFile } from "../../utils/mediaValidation"
import type {
  Clip,
  MediaType,
  Track,
} from "../../project/projectTypes"

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

export function getMediaDuration(file: File, type: MediaType): Promise<number | null> {
  if (type === "image" || type === "subtitles") return Promise.resolve(null)

  return new Promise((resolve) => {
    const element =
      type === "video"
        ? document.createElement("video")
        : document.createElement("audio")
    const url = URL.createObjectURL(file)
    element.src = url
    element.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(element.duration)
    }
    element.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
  })
}

export function detectMediaType(file: File): MediaType | null {
  const result = validateMediaFile(file)
  return result.type
}

export function findClipById(tracks: Track[], clipId: string): Clip | undefined {
  for (const track of tracks) {
    const clip = track.clips.find(c => c.id === clipId)
    if (clip) return clip
  }
  return undefined
}

export function normalizeTimelineValue(value: number): number {
  return toSeconds(toMs(value))
}

export function applyTrackRippleForEndChange(track: Track, clipId: string, requestedEnd: number): Track {
  const targetClip = track.clips.find(clip => clip.id === clipId)
  if (!targetClip) return track

  const normalizedRequestedEnd = normalizeTimelineValue(requestedEnd)
  const targetCurrentEnd = normalizeTimelineValue(targetClip.timelineEnd)
  if (normalizedRequestedEnd === targetCurrentEnd) return track

  const nextById = new Map<string, Clip>()
  nextById.set(clipId, { ...targetClip, timelineEnd: normalizedRequestedEnd })

  if (normalizedRequestedEnd <= targetCurrentEnd) {
    return {
      ...track,
      clips: track.clips.map(clip => nextById.get(clip.id) ?? clip),
    }
  }

  const downstream = track.clips
    .filter(clip => clip.id !== clipId && clip.timelineStart >= targetClip.timelineStart)
    .slice()
    .sort((a, b) => {
      const startDiff = a.timelineStart - b.timelineStart
      if (Math.abs(startDiff) > Number.EPSILON) return startDiff
      return a.id.localeCompare(b.id)
    })

  let requiredStart = normalizedRequestedEnd
  let cumulativeShift = 0

  for (const downstreamClip of downstream) {
    let shiftedStart = normalizeTimelineValue(downstreamClip.timelineStart + cumulativeShift)
    let shiftedEnd = normalizeTimelineValue(downstreamClip.timelineEnd + cumulativeShift)

    if (shiftedStart < requiredStart) {
      const extraShift = normalizeTimelineValue(requiredStart - shiftedStart)
      cumulativeShift = normalizeTimelineValue(cumulativeShift + extraShift)
      shiftedStart = normalizeTimelineValue(shiftedStart + extraShift)
      shiftedEnd = normalizeTimelineValue(shiftedEnd + extraShift)
    }

    nextById.set(downstreamClip.id, {
      ...downstreamClip,
      timelineStart: shiftedStart,
      timelineEnd: shiftedEnd,
    })

    requiredStart = shiftedEnd
  }

  return {
    ...track,
    clips: track.clips.map(clip => nextById.get(clip.id) ?? clip),
  }
}
