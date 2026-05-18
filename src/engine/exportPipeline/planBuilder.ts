import type {
  Clip,
  Project,
  Track,
  VideoClip,
  ImageClip,
  TextClip,
  AudioClip,
  ExportOutputFormat,
  ExportVideoCodec,
  CompiledTransition,
} from "../../project/projectTypes"
import type {
  RenderPlan,
  RenderSegment,
  RenderTransition,
  MediaProbeResult,
  OutputTarget,
  EncodingPreset,
} from "./types"
import { DEFAULT_SPEED } from "../../constants/speed"
import { toSeconds, toMs } from "../../utils/time"
import { compileUnifiedTransitions } from "../transitionCompiler"
import { buildOutputTarget } from "./encodingPresets"
import { safeMediaFileName } from "../ffmpegUtils"

function segmentId(clipId: string, trackId: string): string {
  return `${trackId}_${clipId}`
}

function buildRenderSegmentFromVideo(clip: VideoClip, track: Track): RenderSegment {
  return {
    id: segmentId(clip.id, track.id),
    clipId: clip.id,
    mediaId: clip.mediaId,
    mediaStart: clip.mediaStart,
    mediaEnd: clip.mediaEnd,
    timelineStart: clip.timelineStart,
    timelineEnd: clip.timelineEnd,
    speed: clip.speed ?? DEFAULT_SPEED,
    type: "video",
    trackId: track.id,
    trackOrder: track.order,
    trackType: track.type,
    transform: clip.transform ?? null,
    colorAdjustments: clip.colorAdjustments ?? null,
    audioConfig: clip.audioConfig ?? null,
    volume: clip.volume ?? null,
  }
}

function buildRenderSegmentFromImage(clip: ImageClip, track: Track): RenderSegment {
  return {
    id: segmentId(clip.id, track.id),
    clipId: clip.id,
    mediaId: clip.mediaId,
    mediaStart: clip.timelineStart,
    mediaEnd: clip.timelineEnd,
    timelineStart: clip.timelineStart,
    timelineEnd: clip.timelineEnd,
    speed: DEFAULT_SPEED,
    type: "image",
    trackId: track.id,
    trackOrder: track.order,
    trackType: track.type,
    transform: clip.transform ?? null,
    colorAdjustments: clip.colorAdjustments ?? null,
    audioConfig: null,
    volume: null,
  }
}

function buildRenderSegmentFromText(clip: TextClip, track: Track): RenderSegment {
  return {
    id: segmentId(clip.id, track.id),
    clipId: clip.id,
    mediaId: `text_${clip.id}`,
    mediaStart: clip.timelineStart,
    mediaEnd: clip.timelineEnd,
    timelineStart: clip.timelineStart,
    timelineEnd: clip.timelineEnd,
    speed: DEFAULT_SPEED,
    type: "text",
    trackId: track.id,
    trackOrder: track.order,
    trackType: track.type,
    transform: clip.transform ?? null,
    colorAdjustments: null,
    audioConfig: null,
    volume: null,
    content: clip.content,
    style: clip.style,
  }
}

function buildRenderSegmentFromAudio(clip: AudioClip, track: Track): RenderSegment {
  return {
    id: segmentId(clip.id, track.id),
    clipId: clip.id,
    mediaId: clip.mediaId,
    mediaStart: clip.mediaStart,
    mediaEnd: clip.mediaEnd,
    timelineStart: clip.timelineStart,
    timelineEnd: clip.timelineEnd,
    speed: clip.speed ?? DEFAULT_SPEED,
    type: "audio",
    trackId: track.id,
    trackOrder: track.order,
    trackType: track.type,
    transform: null,
    colorAdjustments: null,
    audioConfig: clip.audioConfig ?? null,
    volume: clip.volume ?? null,
  }
}

function buildRenderSegment(clip: Clip, track: Track): RenderSegment {
  switch (clip.type) {
    case "video":
      return buildRenderSegmentFromVideo(clip, track)
    case "image":
      return buildRenderSegmentFromImage(clip, track)
    case "text":
      return buildRenderSegmentFromText(clip, track)
    case "audio":
      return buildRenderSegmentFromAudio(clip, track)
  }
}

function convertTransition(t: CompiledTransition): RenderTransition {
  return {
    transitionId: t.transitionId,
    trackId: t.trackId,
    clipARef: t.clipARef.clipId
      ? { clipId: t.clipARef.clipId }
      : { synthetic: "black_silence" as const },
    clipBRef: t.clipBRef.clipId
      ? { clipId: t.clipBRef.clipId }
      : { synthetic: "black_silence" as const },
    startTimeS: t.startTimeS,
    endTimeS: t.endTimeS,
    durationS: t.durationS,
    boundaryTimeS: t.boundaryTimeS,
    typeCanonical: t.typeCanonical,
    audioCurveType: t.audioCurveType,
  }
}

function computePlanId(
  project: Project,
  outputTarget: OutputTarget,
): string {
  const parts: string[] = []
  parts.push(`${outputTarget.format}_${outputTarget.resolution.width}x${outputTarget.resolution.height}_${outputTarget.fps}fps_${outputTarget.codec}_${outputTarget.crf}`)
  const sortedTracks = [...project.tracks].sort((a, b) => a.order - b.order)
  for (const track of sortedTracks) {
    parts.push(`track:${track.id}:${track.type}:${track.order}`)
    const sortedClips = [...track.clips].sort((a, b) => a.timelineStart - b.timelineStart)
    for (const clip of sortedClips) {
      parts.push(`clip:${clip.id}:${clip.type}:${toMs(clip.timelineStart)}:${toMs(clip.timelineEnd)}`)
    }
  }
  return parts.join("|")
}

function computeDurationInMs(segments: RenderSegment[]): number {
  if (segments.length === 0) return 0
  let maxEnd = 0
  for (const s of segments) {
    if (s.timelineEnd > maxEnd) maxEnd = s.timelineEnd
  }
  return toMs(maxEnd)
}

export function buildRenderPlan(
  project: Project,
  format: ExportOutputFormat,
  codec: ExportVideoCodec,
  resolution: { width: number; height: number },
  fps: number,
  preset: EncodingPreset,
  probeResults: MediaProbeResult[],
  mediaFiles: Map<string, File>,
): RenderPlan {
  const segments: RenderSegment[] = []
  const sortedTracks = [...project.tracks].sort((a, b) => a.order - b.order)

  for (const track of sortedTracks) {
    for (const clip of track.clips) {
      segments.push(buildRenderSegment(clip, track))
    }
  }

  // Validate segments - check for missing media files
  const segmentsWithMedia: RenderSegment[] = []
  const skippedSegments: Array<{ id: string; mediaId: string | undefined; reason: string }> = []

  for (const segment of segments) {
    // Check for undefined mediaId
    if (!segment.mediaId) {
      skippedSegments.push({ id: segment.id, mediaId: segment.mediaId, reason: "undefined mediaId" })
      console.warn(`[planBuilder] Skipping segment ${segment.id}: undefined mediaId`)
      continue
    }

    // Check if mediaId exists in mediaFiles
    if (!mediaFiles.has(segment.mediaId)) {
      // Only warn/skip for video/image/audio types that NEED media files
      if (segment.type === "video" || segment.type === "image" || segment.type === "audio") {
        skippedSegments.push({ id: segment.id, mediaId: segment.mediaId, reason: `${segment.type} media file not found` })
        console.warn(`[planBuilder] Skipping ${segment.type} segment ${segment.id}: mediaId "${segment.mediaId}" not in mediaFiles`)
        continue
      }
      // Text segments can have synthetic mediaIds, skip the file check
    }

    segmentsWithMedia.push(segment)
  }

  if (skippedSegments.length > 0) {
    console.warn("[planBuilder] Skipped segments:", skippedSegments)
  }

  console.log("[planBuilder] Building plan with", segmentsWithMedia.length, "segments (skipped", skippedSegments.length, ")")

  segmentsWithMedia.sort((a, b) => {
    const trackDiff = a.trackOrder - b.trackOrder
    if (trackDiff !== 0) return trackDiff
    return a.timelineStart - b.timelineStart
  })

  const compiled = compileUnifiedTransitions(project)
  const transitions = compiled.transitions.map(convertTransition)

  const outputTarget = buildOutputTarget(format, codec, resolution, fps, preset)

  const projectDuration = toSeconds(computeDurationInMs(segmentsWithMedia))

  const mediaFileNames = new Map<string, string>()
  for (const [mediaId, file] of mediaFiles) {
    mediaFileNames.set(mediaId, safeMediaFileName(mediaId, file))
  }

  const estimatedTotalFrames = Math.ceil(projectDuration * fps)

  const plan: RenderPlan = {
    id: computePlanId(project, outputTarget),
    createdAt: Date.now(),
    projectDuration,
    outputTarget,
    segments: segmentsWithMedia,
    transitions,
    probeResults,
    canStreamCopy: false,
    streamCopySegments: [],
    estimatedTotalFrames,
    mediaFileNames,
  }

  return plan
}