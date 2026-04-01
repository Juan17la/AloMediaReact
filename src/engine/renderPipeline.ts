import type {
  CompiledTransition,
  Clip,
  ExportOutputFormat,
  ExportVideoCodec,
  Project,
  RenderJob,
  RenderSegment,
} from "../project/projectTypes"
import { getProjectDuration, CLIP_EPSILON } from "../utils/time"
import { DEFAULT_SPEED } from "../constants/speed"
import { compileUnifiedTransitions } from "./transitionCompiler"
import { isTransitionCompilerCutoverEnabled } from "./transitionCutoverFlag"

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
      clipId: clip.id,
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
      clipId: clip.id,
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
      clipId: clip.id,
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
    clipId: clip.id,
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

function resolveTransitionsFromCompiler(segments: RenderSegment[], compiledTransitions: CompiledTransition[]): void {
  const byClipId = new Map<string, RenderSegment>()
  for (const seg of segments) {
    if (seg.type !== "video") continue
    seg.resolvedTransitionIn = undefined
    seg.resolvedTransitionOut = undefined
    byClipId.set(seg.clipId, seg)
  }

  for (const transition of compiledTransitions) {
    if (transition.durationS <= CLIP_EPSILON) continue

    const clipA = transition.clipARef.clipId ? byClipId.get(transition.clipARef.clipId) : undefined
    const clipB = transition.clipBRef.clipId ? byClipId.get(transition.clipBRef.clipId) : undefined

    if (clipA && clipB) {
      clipA.resolvedTransitionOut = {
        type: transition.typeCanonical,
        duration: transition.durationS,
        overlapStartS: transition.startTimeS,
        kind: "crossfade",
      }
      clipB.resolvedTransitionIn = {
        type: transition.typeCanonical,
        duration: transition.durationS,
        overlapStartS: transition.startTimeS,
        kind: "crossfade",
      }
      continue
    }

    if (clipA && !clipB) {
      clipA.resolvedTransitionOut = {
        type: transition.typeCanonical,
        duration: transition.durationS,
        overlapStartS: transition.startTimeS,
        kind: "fade_to_black",
      }
      continue
    }

    if (!clipA && clipB) {
      clipB.resolvedTransitionIn = {
        type: transition.typeCanonical,
        duration: transition.durationS,
        overlapStartS: transition.startTimeS,
        kind: "fade_from_black",
      }
    }
  }
}

function clampLegacyDuration(
  duration: number,
  clipA: { timelineStart: number; timelineEnd: number } | null,
  clipB: { timelineStart: number; timelineEnd: number } | null,
): number {
  const durationA = clipA ? Math.max(0, clipA.timelineEnd - clipA.timelineStart) : Infinity
  const durationB = clipB ? Math.max(0, clipB.timelineEnd - clipB.timelineStart) : Infinity
  const maxDuration = Math.min(durationA, durationB) / 2
  return Math.max(0, Math.min(duration, maxDuration))
}

function resolveTransitionsLegacy(segments: RenderSegment[]): void {
  const byTrack = new Map<string, RenderSegment[]>()
  for (const seg of segments) {
    if (seg.type !== "video") continue
    seg.resolvedTransitionIn = undefined
    seg.resolvedTransitionOut = undefined
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

      const hasAdjacentNext = !!nextSeg && Math.abs(nextSeg.timelineStart - seg.timelineEnd) <= CLIP_EPSILON
      const hasAdjacentPrev = !!prevSeg && Math.abs(prevSeg.timelineEnd - seg.timelineStart) <= CLIP_EPSILON

      if (seg.transitionOut && seg.transitionOut.duration > CLIP_EPSILON) {
        const duration = clampLegacyDuration(seg.transitionOut.duration, seg, hasAdjacentNext ? nextSeg : null)
        if (duration > CLIP_EPSILON) {
          const kind = hasAdjacentNext ? "crossfade" : "fade_to_black"
          seg.resolvedTransitionOut = {
            type: seg.transitionOut.type,
            duration,
            overlapStartS: seg.timelineEnd - duration,
            kind,
          }
        }
      }

      if (seg.transitionIn && seg.transitionIn.duration > CLIP_EPSILON) {
        const prevHasTransitionOut = hasAdjacentPrev && !!prevSeg?.transitionOut && prevSeg.transitionOut.duration > CLIP_EPSILON
        if (!prevHasTransitionOut) {
          const duration = clampLegacyDuration(seg.transitionIn.duration, hasAdjacentPrev ? prevSeg : null, seg)
          if (duration > CLIP_EPSILON) {
            const kind = hasAdjacentPrev ? "crossfade" : "fade_from_black"
            seg.resolvedTransitionIn = {
              type: seg.transitionIn.type,
              duration,
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

  const useCompiler = isTransitionCompilerCutoverEnabled()
  const compiled = useCompiler ? compileUnifiedTransitions(project) : { transitions: [], warnings: [] }
  if (useCompiler) {
    for (const warning of compiled.warnings) {
      console.warn(warning)
    }
    resolveTransitionsFromCompiler(segments, compiled.transitions)
  } else {
    resolveTransitionsLegacy(segments)
  }

  return {
    segments,
    transitions: compiled.transitions,
    outputFormat: options.outputFormat,
    codec: options.codec,
    resolution: options.resolution,
    fps: options.fps,
    outputFileName: options.outputFileName,
    projectDuration,
  }
}
