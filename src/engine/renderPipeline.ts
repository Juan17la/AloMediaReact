import type { Clip, Project, RenderJob, RenderSegment } from "./projectTypes"

function clipToSegment(clip: Clip): RenderSegment {
  if (clip.type === "video") {
    return {
      mediaId: clip.mediaId,
      mediaStart: clip.mediaStart,
      mediaEnd: clip.mediaEnd,
      timelineStart: clip.timelineStart,
      timelineEnd: clip.timelineEnd,
      type: "video",
      transform: clip.transform,
      volume: clip.volume,
    }
  }

  if (clip.type === "audio") {
    return {
      mediaId: clip.mediaId,
      mediaStart: clip.mediaStart,
      mediaEnd: clip.mediaEnd,
      timelineStart: clip.timelineStart,
      timelineEnd: clip.timelineEnd,
      type: "audio",
      volume: clip.volume,
    }
  }

  if (clip.type === "image") {
    return {
      mediaId: clip.mediaId,
      mediaStart: 0,
      mediaEnd: clip.timelineEnd - clip.timelineStart,
      timelineStart: clip.timelineStart,
      timelineEnd: clip.timelineEnd,
      type: "image",
      transform: clip.transform,
    }
  }

  // TextClip
  return {
    mediaId: "",
    mediaStart: 0,
    mediaEnd: clip.timelineEnd - clip.timelineStart,
    timelineStart: clip.timelineStart,
    timelineEnd: clip.timelineEnd,
    type: "text",
    transform: clip.transform,
  }
}

export function buildRenderJob(
  project: Project,
  outputFormat: "mp4" | "webm",
  resolution: { width: number; height: number },
  fps: number
): RenderJob {
  const segments: RenderSegment[] = project.tracks
    .flatMap(track => track.clips.map(clipToSegment))
    .sort((a, b) => a.timelineStart - b.timelineStart)

  return { segments, outputFormat, resolution, fps }
}
