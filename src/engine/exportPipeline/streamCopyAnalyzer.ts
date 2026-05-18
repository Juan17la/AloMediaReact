import type { RenderPlan, RenderSegment, StreamCopySegment, MediaProbeResult } from "./types"
import { DEFAULT_COLOR_ADJUSTMENTS } from "../../constants/colorAdjustments"
import { DEFAULT_SPEED } from "../../constants/speed"

const IDENTITY_TRANSFORM = { x: 0, y: 0, width: 100, height: 100, rotation: 0 }
const IDENTITY_AUDIO_CONFIG = { volume: 1, muted: false, fadeInDuration: 0, fadeOutDuration: 0, balance: 0 }

interface StreamCopyAnalysis {
  canStreamCopy: boolean
  segments: StreamCopySegment[]
  reason: string | null
}

function segmentHasModifications(segment: RenderSegment): boolean {
  if (segment.speed !== DEFAULT_SPEED) return true
  if (segment.transform) {
    const t = segment.transform
    if (
      t.x !== IDENTITY_TRANSFORM.x ||
      t.y !== IDENTITY_TRANSFORM.y ||
      t.width !== IDENTITY_TRANSFORM.width ||
      t.height !== IDENTITY_TRANSFORM.height ||
      t.rotation !== IDENTITY_TRANSFORM.rotation
    ) {
      return true
    }
  }
  if (segment.colorAdjustments) {
    const a = segment.colorAdjustments
    const d = DEFAULT_COLOR_ADJUSTMENTS
    if (a.brightness !== d.brightness) return true
    if (a.contrast !== d.contrast) return true
    if (a.saturation !== d.saturation) return true
    if (a.gamma !== d.gamma) return true
    if ((a.exposure ?? d.exposure) !== d.exposure) return true
    if ((a.shadow ?? d.shadow ?? 0) !== 0) return true
    if ((a.definition ?? d.definition ?? 0) !== 0) return true
  }
  if (segment.audioConfig) {
    const c = segment.audioConfig
    const d = IDENTITY_AUDIO_CONFIG
    if (c.volume !== d.volume) return true
    if (c.muted !== d.muted) return true
    if (c.fadeInDuration !== d.fadeInDuration) return true
    if (c.fadeOutDuration !== d.fadeOutDuration) return true
    if (c.balance !== d.balance) return true
  }
  return false
}

function codecMatchesOutput(probeCodec: string, outputCodec: string): boolean {
  const normalized = probeCodec.toLowerCase()
  if (outputCodec === "h264") {
    return normalized === "h264" || normalized === "avc" || normalized === "avc1"
  }
  if (outputCodec === "vp9") {
    return normalized === "vp9" || normalized === "libvpx-vp9"
  }
  if (outputCodec === "av1") {
    return normalized === "av1" || normalized === "libaom-av1"
  }
  return normalized === outputCodec
}

function resolutionMatches(probe: MediaProbeResult, width: number, height: number): boolean {
  return probe.width === width && probe.height === height
}

function fpsMatches(probe: MediaProbeResult, targetFps: number): boolean {
  return Math.abs(probe.fps - targetFps) < 0.5
}

export function analyzeStreamCopyOpportunities(
  plan: RenderPlan,
  probeResults: Map<string, MediaProbeResult>,
): StreamCopyAnalysis {
  const { segments, transitions, outputTarget } = plan

  if (transitions.length > 0) {
    return {
      canStreamCopy: false,
      segments: [],
      reason: "transitions_present",
    }
  }

  const videoSegments = segments.filter((s) => s.trackType === "video")
  const audioSegments = segments.filter((s) => s.trackType === "audio")

  if (videoSegments.length === 0) {
    return {
      canStreamCopy: false,
      segments: [],
      reason: "no_video_segments",
    }
  }

  const videoTrackIds = new Set(videoSegments.map((s) => s.trackId))
  const audioTrackIds = new Set(audioSegments.map((s) => s.trackId))

  if (videoTrackIds.size > 1) {
    return {
      canStreamCopy: false,
      segments: [],
      reason: "multiple_video_tracks",
    }
  }

  if (audioTrackIds.size > 1) {
    return {
      canStreamCopy: false,
      segments: [],
      reason: "multiple_audio_tracks",
    }
  }

  const hasOverlaps = checkSegmentOverlaps(videoSegments)
  if (hasOverlaps) {
    return {
      canStreamCopy: false,
      segments: [],
      reason: "overlapping_video_segments",
    }
  }

  const copyableSegments: StreamCopySegment[] = []
  const outputCodecName = outputTarget.codec === "h264" || outputTarget.codec.includes("264")
    ? "h264"
    : outputTarget.codec

  for (const segment of videoSegments) {
    const probe = probeResults.get(segment.mediaId)
    if (!probe) {
      return {
        canStreamCopy: false,
        segments: [],
        reason: `missing_probe_${segment.mediaId}`,
      }
    }

    if (segmentHasModifications(segment)) {
      return {
        canStreamCopy: false,
        segments: [],
        reason: `modified_segment_${segment.clipId}`,
      }
    }

    if (!codecMatchesOutput(probe.codec, outputCodecName)) {
      return {
        canStreamCopy: false,
        segments: [],
        reason: `codec_mismatch_${probe.codec}_vs_${outputCodecName}`,
      }
    }

    if (!resolutionMatches(probe, outputTarget.resolution.width, outputTarget.resolution.height)) {
      return {
        canStreamCopy: false,
        segments: [],
        reason: "resolution_mismatch",
      }
    }

    if (!fpsMatches(probe, outputTarget.fps)) {
      return {
        canStreamCopy: false,
        segments: [],
        reason: "fps_mismatch",
      }
    }

    if (probe.isVfr) {
      return {
        canStreamCopy: false,
        segments: [],
        reason: "variable_frame_rate",
      }
    }

    copyableSegments.push({
      mediaId: segment.mediaId,
      mediaStart: segment.mediaStart,
      mediaEnd: segment.mediaEnd,
      timelineStart: segment.timelineStart,
      timelineEnd: segment.timelineEnd,
      codec: probe.codec,
    })
  }

  return {
    canStreamCopy: true,
    segments: copyableSegments,
    reason: null,
  }
}

function checkSegmentOverlaps(segments: RenderSegment[]): boolean {
  const sorted = segments.slice().sort((a, b) => a.timelineStart - b.timelineStart)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].timelineStart < sorted[i - 1].timelineEnd - 0.001) {
      return true
    }
  }
  return false
}

export function findPartialStreamCopySegments(
  plan: RenderPlan,
  probeResults: Map<string, MediaProbeResult>,
): StreamCopySegment[] {
  const segments: StreamCopySegment[] = []
  const outputCodecName = plan.outputTarget.codec === "h264" || plan.outputTarget.codec.includes("264")
    ? "h264"
    : plan.outputTarget.codec

  for (const segment of plan.segments) {
    if (segment.type !== "video" && segment.type !== "audio") continue
    if (segmentHasModifications(segment)) continue

    const probe = probeResults.get(segment.mediaId)
    if (!probe) continue
    if (!codecMatchesOutput(probe.codec, outputCodecName)) continue
    if (!resolutionMatches(probe, plan.outputTarget.resolution.width, plan.outputTarget.resolution.height)) continue
    if (!fpsMatches(probe, plan.outputTarget.fps)) continue
    if (probe.isVfr) continue

    segments.push({
      mediaId: segment.mediaId,
      mediaStart: segment.mediaStart,
      mediaEnd: segment.mediaEnd,
      timelineStart: segment.timelineStart,
      timelineEnd: segment.timelineEnd,
      codec: probe.codec,
    })
  }

  return segments
}