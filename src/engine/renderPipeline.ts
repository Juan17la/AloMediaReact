import type {
  Clip,
  ExportOutputFormat,
  ExportVideoCodec,
  Project,
  RenderJob,
  RenderSegment,
} from "../project/projectTypes"
import { getProjectDuration } from "../utils/time"
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
      outTransition: clip.outTransition,
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
