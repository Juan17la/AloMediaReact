import type {
  Clip,
  ClipTransition,
  ExportOutputFormat,
  ExportVideoCodec,
  Project,
  RenderJob,
  RenderSegment,
} from "../project/projectTypes"
import { getProjectDuration, CLIP_EPSILON } from "../utils/time"
import { DEFAULT_SPEED } from "../constants/speed"

export interface ExportOptions {
  outputFormat: ExportOutputFormat
  codec?: ExportVideoCodec
  resolution: { width: number; height: number }
  fps: number
  outputFileName: string
}

function clipToSegment(
  clip: Clip,
  trackId: string,
  trackOrder: number,
  trackType: 'video' | 'audio',
): RenderSegment {
  if (clip.type === "video") {
    return {
      mediaId: clip.mediaId,
      mediaStart: clip.mediaStart,
      mediaEnd: clip.mediaEnd,
      timelineStart: clip.timelineStart,
      timelineEnd: clip.timelineEnd,
      speed: clip.speed ?? DEFAULT_SPEED,
      type: "video",
      trackId,
      trackOrder,
      trackType,
      transform: clip.transform,
      volume: clip.audioConfig?.volume ?? clip.volume,
      colorAdjustments: clip.colorAdjustments,
      audioConfig: clip.audioConfig,
      transitionIn: clip.transitionIn,
      transitionOut: clip.transitionOut,
    }
  }

  if (clip.type === "audio") {
    return {
      mediaId: clip.mediaId,
      mediaStart: clip.mediaStart,
      mediaEnd: clip.mediaEnd,
      timelineStart: clip.timelineStart,
      timelineEnd: clip.timelineEnd,
      speed: clip.speed ?? DEFAULT_SPEED,
      type: "audio",
      trackId,
      trackOrder,
      trackType,
      volume: clip.audioConfig?.volume ?? clip.volume,
      audioConfig: clip.audioConfig,
    }
  }

  if (clip.type === "image") {
    return {
      mediaId: clip.mediaId,
      mediaStart: 0,
      mediaEnd: clip.timelineEnd - clip.timelineStart,
      timelineStart: clip.timelineStart,
      timelineEnd: clip.timelineEnd,
      speed: DEFAULT_SPEED,
      type: "image",
      trackId,
      trackOrder,
      trackType,
      transform: clip.transform,
      colorAdjustments: clip.colorAdjustments,
    }
  }

  // TextClip — mediaId is empty; filtered out downstream
  return {
    mediaId: "",
    mediaStart: 0,
    mediaEnd: clip.timelineEnd - clip.timelineStart,
    timelineStart: clip.timelineStart,
    timelineEnd: clip.timelineEnd,
    speed: DEFAULT_SPEED,
    type: "text",
    trackId,
    trackOrder,
    trackType,
    transform: clip.transform,
  }
}

function clampTransition(
  t: ClipTransition,
  clipA: { timelineStart: number; timelineEnd: number } | null,
  clipB: { timelineStart: number; timelineEnd: number } | null,
): ClipTransition {
  const durationA = clipA ? Math.max(0, clipA.timelineEnd - clipA.timelineStart) : Infinity
  const durationB = clipB ? Math.max(0, clipB.timelineEnd - clipB.timelineStart) : Infinity
  const maxDuration = Math.min(durationA, durationB) / 2
  return { ...t, duration: Math.min(t.duration, maxDuration) }
}

/**
 * Resolves raw transitionIn/transitionOut into concrete ResolvedTransition values.
 * Evaluates the priority rule: if clip A has transitionOut and clip B has transitionIn,
 * transitionOut of A wins and transitionIn of B is discarded for that pair.
 * Called once per render job — consumers read resolvedTransitionIn/Out.
 */
function resolveTransitions(segments: RenderSegment[]): void {
  // Group video segments by track
  const byTrack = new Map<string, RenderSegment[]>()
  for (const seg of segments) {
    if (seg.type !== "video") continue
    const list = byTrack.get(seg.trackId)
    if (list) list.push(seg)
    else byTrack.set(seg.trackId, [seg])
  }

  for (const trackSegs of byTrack.values()) {
    trackSegs.sort((a, b) => a.timelineStart - b.timelineStart)

    for (let i = 0; i < trackSegs.length; i++) {
      const seg = trackSegs[i]
      const prevSeg = i > 0 ? trackSegs[i - 1] : null
      const nextSeg = i < trackSegs.length - 1 ? trackSegs[i + 1] : null

      // Check adjacency
      const hasAdjacentNext = nextSeg && Math.abs(nextSeg.timelineStart - seg.timelineEnd) <= CLIP_EPSILON
      const hasAdjacentPrev = prevSeg && Math.abs(prevSeg.timelineEnd - seg.timelineStart) <= CLIP_EPSILON

      // --- transitionOut ---
      if (seg.transitionOut && seg.transitionOut.duration > CLIP_EPSILON) {
        const clamped = clampTransition(seg.transitionOut, seg, hasAdjacentNext ? nextSeg : null)
        if (clamped.duration > CLIP_EPSILON) {
          const kind = hasAdjacentNext ? 'crossfade' as const : 'fade_to_black' as const
          seg.resolvedTransitionOut = {
            type: clamped.type,
            duration: clamped.duration,
            overlapStartS: seg.timelineEnd - clamped.duration,
            kind,
          }
        }
      }

      // --- transitionIn ---
      // Only if the previous clip does NOT have transitionOut (priority rule)
      if (seg.transitionIn && seg.transitionIn.duration > CLIP_EPSILON) {
        const prevHasTransitionOut = hasAdjacentPrev && prevSeg!.transitionOut &&
          prevSeg!.transitionOut.duration > CLIP_EPSILON
        if (!prevHasTransitionOut) {
          const clamped = clampTransition(seg.transitionIn, hasAdjacentPrev ? prevSeg : null, seg)
          if (clamped.duration > CLIP_EPSILON) {
            const kind = hasAdjacentPrev ? 'crossfade' as const : 'fade_from_black' as const
            seg.resolvedTransitionIn = {
              type: clamped.type,
              duration: clamped.duration,
              overlapStartS: seg.timelineStart,
              kind,
            }
          }
        }
      }
    }
  }
}

export function buildRenderJob(
  project: Project,
  fileMap: Map<string, File>,
  options: ExportOptions,
): RenderJob {
  const projectDuration = Math.max(getProjectDuration(project.tracks), 0.1)

  const segments: RenderSegment[] = []

  for (const track of project.tracks) {
    for (const clip of track.clips) {
      const seg = clipToSegment(clip, track.id, track.order, track.type)

      // Skip text clips and clips with no backing file
      if (seg.type === "text") continue
      if (!seg.mediaId) continue
      if (!fileMap.has(seg.mediaId)) {
        console.warn(`[renderPipeline] No file for mediaId "${seg.mediaId}" — skipping clip`)
        continue
      }

      segments.push(seg)
    }
  }

  resolveTransitions(segments)

  return {
    segments,
    outputFormat: options.outputFormat,
    codec: options.codec,
    resolution: options.resolution,
    fps: options.fps,
    outputFileName: options.outputFileName,
    projectDuration,
  }
}
