import type {
  RenderPlan,
  RenderSegment,
  RenderTransition,
  FilterGraphResult,
  MediaProbeResult,
} from "./types"
import { buildVideoSpeedFilter, buildAudioSpeedFilter } from "../../utils/speedFilters"
import { buildFullAudioFilterChain } from "../../utils/audioFilters"
import { buildEqFilter, buildShadowFilter, buildDefinitionFilter } from "../../utils/colorAdjustmentFilters"
import { DEFAULT_SPEED } from "../../constants/speed"
import { DEFAULT_COLOR_ADJUSTMENTS } from "../../constants/colorAdjustments"
import { resolveCanonicalTransitionType } from "../transitionRegistry"

interface InputInfo {
  mediaId: string
  inputIndex: number
  isImage: boolean
  fileName: string
  duration: number
  hasVideo: boolean
  hasAudio: boolean
}

// The editor canvas is fixed at 1280x720. Transform values (x, y, width, height)
// are in pixel coordinates on this canvas.
const CANVAS_W = 1280
const CANVAS_H = 720

let _labelIdx = 0

function nextLabel(prefix: string = "v"): string {
  return `${prefix}${_labelIdx++}`
}

function hasAudioStream(seg: RenderSegment): boolean {
  return seg.type === "audio" || seg.type === "video"
}

function segmentDuration(seg: RenderSegment): number {
  return Math.max(0, seg.timelineEnd - seg.timelineStart)
}

function isIdentityTransform(transform: RenderSegment["transform"]): boolean {
  if (!transform) return true
  return (
    Math.abs(transform.x) < 0.01 &&
    Math.abs(transform.y) < 0.01 &&
    Math.abs(transform.width - CANVAS_W) < 0.01 &&
    Math.abs(transform.height - CANVAS_H) < 0.01 &&
    Math.abs(transform.rotation) < 0.01
  )
}

function isIdentityColor(adj: RenderSegment["colorAdjustments"]): boolean {
  if (!adj) return true
  const d = DEFAULT_COLOR_ADJUSTMENTS
  return (
    (adj.brightness ?? d.brightness) === d.brightness &&
    (adj.contrast ?? d.contrast) === d.contrast &&
    (adj.saturation ?? d.saturation) === d.saturation &&
    (adj.gamma ?? d.gamma) === d.gamma &&
    (adj.exposure ?? d.exposure) === d.exposure &&
    (adj.shadow ?? d.shadow ?? 0) === 0 &&
    (adj.definition ?? d.definition ?? 0) === 0
  )
}

export function buildFilterGraph(
  plan: RenderPlan,
  probeResults: Map<string, MediaProbeResult>,
): FilterGraphResult {
  const { segments, transitions, outputTarget } = plan
  const { width: targetW, height: targetH } = outputTarget.resolution
  const targetFps = outputTarget.fps
  const mediaFileNames = plan.mediaFileNames

  // Total project duration — every track must be padded to this length
  // so that clips ending early don't freeze their last opaque frame.
  const projectDuration = Math.max(0, ...segments.map(s => s.timelineEnd))

  // Scale pixel coordinates from the 1280x720 editor canvas to the output resolution.
  const scaleX = targetW / CANVAS_W
  const scaleY = targetH / CANVAS_H

  _labelIdx = 0
  const filterParts: string[] = []
  const inputArgs: string[] = []
  const inputIndexByMediaId = new Map<string, number>()

  // ============================================================
  // Phase 0: Assign input indices and build input args
  // ============================================================
  const videoSegments = segments.filter((s) => s.trackType === "video" || s.type === "image" || s.type === "text")
  const audioSegments = segments.filter(
    (s) => s.type === "audio" || (s.type === "video" && hasAudioStream(s)),
  )

  // Deduplicate media IDs (skip text — no file input needed)
  const uniqueMediaIds: string[] = []
  const seenMediaIds = new Set<string>()
  for (const seg of segments) {
    if (seg.type === "text") continue
    if (seenMediaIds.has(seg.mediaId)) continue
    seenMediaIds.add(seg.mediaId)
    uniqueMediaIds.push(seg.mediaId)
  }

  const inputInfos: InputInfo[] = []
  let inputIndex = 0

  for (const mediaId of uniqueMediaIds) {
    const matchingSegments = segments.filter((s) => s.mediaId === mediaId)
    const seg = matchingSegments[0]
    const probe = probeResults.get(mediaId)
    const isImage = matchingSegments.some((s) => s.type === "image")
    const isAudioOnly = matchingSegments.every((s) => s.type === "audio")
    const fileName = mediaFileNames.get(mediaId) ?? `media_${mediaId}.mp4`
    const hasVideo = !isAudioOnly
    const hasAudio = isImage ? false : (isAudioOnly ? true : (probe?.audioCodec !== null && probe?.audioCodec !== undefined))

    inputIndexByMediaId.set(mediaId, inputIndex)

    if (isImage) {
      // Use the maximum duration across all segments referencing this image,
      // so that split copies don't run out of frames.
      const maxDuration = Math.max(...matchingSegments.map((s) => segmentDuration(s)))
      inputArgs.push("-loop", "1", "-t", maxDuration.toFixed(3), "-i", fileName)
    } else {
      inputArgs.push("-i", fileName)
    }

    inputInfos.push({
      mediaId,
      inputIndex,
      isImage,
      fileName,
      duration: probe?.duration ?? 0,
      hasVideo,
      hasAudio,
    })
    inputIndex++
  }

  // ============================================================
  // Phase 1: Count references per input for split/asplit
  // ============================================================
  const videoRefCount = new Map<string, number>()
  const audioRefCount = new Map<string, number>()

  for (const seg of videoSegments) {
    if (seg.type === "text") continue
    videoRefCount.set(seg.mediaId, (videoRefCount.get(seg.mediaId) ?? 0) + 1)
  }
  for (const seg of audioSegments) {
    if (seg.type === "text") continue
    audioRefCount.set(seg.mediaId, (audioRefCount.get(seg.mediaId) ?? 0) + 1)
  }

  // ============================================================
  // Phase 2: Build split/asplit filters for multi-referenced inputs
  // ============================================================
  const videoSourceLabels = new Map<string, string[]>()
  const audioSourceLabels = new Map<string, string[]>()

  for (const info of inputInfos) {
    const vRefCount = videoRefCount.get(info.mediaId) ?? 0
    const aRefCount = audioRefCount.get(info.mediaId) ?? 0
    const streamIdx = info.inputIndex

    if (vRefCount > 1) {
      const labels: string[] = []
      const outputs: string[] = []
      for (let i = 0; i < vRefCount; i++) {
        const lbl = nextLabel("sv")
        labels.push(lbl)
        outputs.push(`[${lbl}]`)
      }
      filterParts.push(`[${streamIdx}:v]split=${vRefCount}${outputs.join("")}`)
      videoSourceLabels.set(info.mediaId, labels)
    } else if (vRefCount === 1) {
      videoSourceLabels.set(info.mediaId, [`${streamIdx}:v`])
    }

    if (info.hasAudio && aRefCount > 1) {
      const labels: string[] = []
      const outputs: string[] = []
      for (let i = 0; i < aRefCount; i++) {
        const lbl = nextLabel("sa")
        labels.push(lbl)
        outputs.push(`[${lbl}]`)
      }
      filterParts.push(`[${streamIdx}:a]asplit=${aRefCount}${outputs.join("")}`)
      audioSourceLabels.set(info.mediaId, labels)
    } else if (info.hasAudio && aRefCount === 1) {
      audioSourceLabels.set(info.mediaId, [`${streamIdx}:a`])
    }
  }

  // Counters for tracking which split output to use per mediaId
  const videoSplitIdx = new Map<string, number>()
  const audioSplitIdx = new Map<string, number>()

  function getVideoSourceLabel(mediaId: string): string {
    const labels = videoSourceLabels.get(mediaId)
    if (!labels) throw new Error(`No video source for mediaId: ${mediaId}`)
    const idx = videoSplitIdx.get(mediaId) ?? 0
    videoSplitIdx.set(mediaId, idx + 1)
    return labels[idx]
  }

  function getAudioSourceLabel(mediaId: string): string {
    const labels = audioSourceLabels.get(mediaId)
    if (!labels) throw new Error(`No audio source for mediaId: ${mediaId}`)
    const idx = audioSplitIdx.get(mediaId) ?? 0
    audioSplitIdx.set(mediaId, idx + 1)
    return labels[idx]
  }

  // ============================================================
  // Phase 3: Build per-segment video filter chains
  // ============================================================
  const segVideoLabels = new Map<string, string>()

  for (const seg of videoSegments) {
    const outLabel = nextLabel("segv")
    const sourceLabel = getVideoSourceLabel(seg.mediaId)

    if (seg.type === "text") {
      const dur = segmentDuration(seg)
      const drawtextFilter = buildDrawtextFilter(seg, scaleX, scaleY)
      if (drawtextFilter) {
        filterParts.push(
          `color=black@0:s=${targetW}x${targetH}:d=${dur.toFixed(3)}:rate=${targetFps},format=rgba,${drawtextFilter},setpts=PTS-STARTPTS,fps=${targetFps},setsar=1:1[${outLabel}]`,
        )
      } else {
        filterParts.push(
          `color=black@0:s=${targetW}x${targetH}:d=${dur.toFixed(3)}:rate=${targetFps},format=rgba,setpts=PTS-STARTPTS,fps=${targetFps},setsar=1:1[${outLabel}]`,
        )
      }
      segVideoLabels.set(seg.id, outLabel)
      continue
    }

    const probe = probeResults.get(seg.mediaId)
    const filters: string[] = []

    // Convert to RGBA for alpha-channel compositing between layers.
    // Transparent padding lets lower tracks show through where clips don't fill the canvas.
    filters.push("format=rgba")

    if (seg.type === "image") {
      filters.push("setpts=PTS-STARTPTS")
    } else {
      if (seg.mediaStart > 0.001 || (probe && Math.abs(seg.mediaEnd - probe.duration) > 0.001)) {
        filters.push(`trim=start=${seg.mediaStart.toFixed(3)}:end=${seg.mediaEnd.toFixed(3)}`)
        filters.push("setpts=PTS-STARTPTS")
      }
    }

    const speed = seg.speed ?? DEFAULT_SPEED
    if (Math.abs(speed - DEFAULT_SPEED) > 0.001) {
      const speedFilter = buildVideoSpeedFilter(speed)
      if (speedFilter) filters.push(speedFilter)
    }

    if (!isIdentityTransform(seg.transform)) {
      const t = seg.transform!

      // Transform values are pixel coordinates on the 1280x720 editor canvas.
      // Scale to the output resolution.
      const sw = Math.round(t.width * scaleX)
      const sh = Math.round(t.height * scaleY)
      const px = Math.round(t.x * scaleX)
      const py = Math.round(t.y * scaleY)

      if (Math.abs(t.width - CANVAS_W) > 0.01 || Math.abs(t.height - CANVAS_H) > 0.01) {
        if (Math.abs(t.rotation) > 0.01) {
          filters.push(
            `scale=${sw}:${sh},rotate=${(t.rotation * Math.PI / 180).toFixed(6)}:ow=rotw(${(t.rotation * Math.PI / 180).toFixed(6)}):oh=roth(${(t.rotation * Math.PI / 180).toFixed(6)}):fillcolor=0x00000000`,
          )
        } else {
          filters.push(`scale=${sw}:${sh}`)
        }
      } else if (Math.abs(t.rotation) > 0.01) {
        filters.push(
          `rotate=${(t.rotation * Math.PI / 180).toFixed(6)}:ow=rotw(${(t.rotation * Math.PI / 180).toFixed(6)}):oh=roth(${(t.rotation * Math.PI / 180).toFixed(6)}):fillcolor=0x00000000`,
        )
      }

      // Only add positioning pad when the scaled content fits within the target frame.
      // FFmpeg's pad filter requires input dimensions <= output dimensions.
      const fitsInTarget = sw <= targetW && sh <= targetH
      const needsPositioning = Math.abs(px) > 0.01 || Math.abs(py) > 0.01 || sw !== targetW || sh !== targetH
      if (fitsInTarget && needsPositioning) {
        filters.push(`pad=${targetW}:${targetH}:${px}:${py}:black@0`)
      }
    }

    if (!isIdentityColor(seg.colorAdjustments)) {
      const adj = seg.colorAdjustments!
      const d = DEFAULT_COLOR_ADJUSTMENTS
      const hasEqChanges =
        (adj.brightness ?? d.brightness) !== d.brightness ||
        (adj.contrast ?? d.contrast) !== d.contrast ||
        (adj.saturation ?? d.saturation) !== d.saturation ||
        (adj.gamma ?? d.gamma) !== d.gamma ||
        (adj.exposure ?? d.exposure) !== d.exposure

      const eqFilter = hasEqChanges ? buildEqFilter(adj) : null
      if (eqFilter) filters.push(eqFilter)

      const shadowFilter = buildShadowFilter(adj)
      if (shadowFilter) filters.push(shadowFilter)

      const defFilter = buildDefinitionFilter(adj)
      if (defFilter) filters.push(defFilter)
    }

    filters.push(`format=rgba,scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=black@0`)

    // Normalize fps, timebase, and SAR so all segments are consistent before
    // concat/xfade/overlay operations. Without this, decoded video files carry
    // their original SAR/timebase which mismatches color sources.
    filters.push(`fps=${targetFps},setpts=PTS-STARTPTS,setsar=1:1`)

    if (filters.length > 0) {
      filterParts.push(`[${sourceLabel}]${filters.join(",")}[${outLabel}]`)
    } else {
      segVideoLabels.set(seg.id, sourceLabel)
      continue
    }

    segVideoLabels.set(seg.id, outLabel)
  }

  // ============================================================
  // Phase 4: Build per-segment audio filter chains
  // ============================================================
  const segAudioLabels = new Map<string, string>()

  for (const seg of audioSegments) {
    if (seg.type === "text") continue
    if (!audioSourceLabels.has(seg.mediaId)) continue

    const outLabel = nextLabel("sega")
    const sourceLabel = getAudioSourceLabel(seg.mediaId)
    const filters: string[] = []

    if (seg.mediaStart > 0.001 || (probeResults.get(seg.mediaId) && Math.abs(seg.mediaEnd - (probeResults.get(seg.mediaId)?.duration ?? 0)) > 0.001)) {
      filters.push(`atrim=start=${seg.mediaStart.toFixed(3)}:end=${seg.mediaEnd.toFixed(3)}`)
      filters.push("asetpts=PTS-STARTPTS")
    }

    const speed = seg.speed ?? DEFAULT_SPEED
    if (Math.abs(speed - DEFAULT_SPEED) > 0.001) {
      const audioSpeedFilter = buildAudioFilter(speed)
      if (audioSpeedFilter) filters.push(audioSpeedFilter)
    }

    if (seg.audioConfig) {
      const duration = segmentDuration(seg)
      const chain = buildFullAudioFilterChain(seg.audioConfig, duration)
      if (chain) filters.push(...chain.split(","))
    } else if (seg.volume !== null && seg.volume !== undefined && Math.abs(seg.volume - 1.0) > 0.001) {
      filters.push(`volume=${seg.volume}`)
    }

    // Position this audio clip at its correct timeline start time so that
    // clips on different parts of the timeline don't all overlap at t=0.
    const delayMs = Math.round(seg.timelineStart * 1000)
    if (delayMs > 0) {
      filters.push(`adelay=delays=${delayMs}:all=1`)
    }

    if (filters.length > 0) {
      filterParts.push(`[${sourceLabel}]${filters.join(",")}[${outLabel}]`)
      segAudioLabels.set(seg.id, outLabel)
    } else {
      segAudioLabels.set(seg.id, sourceLabel)
    }
  }

  // ============================================================
  // Phase 5: Assemble video tracks
  // Each track must start at timeline time 0 and include transparent gaps
// for periods where no clip is active, so overlay compositing is correct.
// After every concat/xfade/fade, we normalize timebase with setpts+fps
// to prevent "timebase mismatch" errors between color sources and file sources.
// ============================================================
const videoTrackGroups = new Map<number, RenderSegment[]>()
for (const seg of videoSegments) {
    const group = videoTrackGroups.get(seg.trackOrder) ?? []
    group.push(seg)
    videoTrackGroups.set(seg.trackOrder, group)
  }

  const trackVideoLabels = new Map<number, string>()

  function normalizeTb(label: string): string {
    const normLabel = nextLabel("ntb")
    filterParts.push(`[${label}]setpts=PTS-STARTPTS,fps=${targetFps}[${normLabel}]`)
    return normLabel
  }

  for (const [trackOrder, trackSegs] of videoTrackGroups) {
    const sorted = [...trackSegs].sort((a, b) => a.timelineStart - b.timelineStart)

    if (sorted.length === 0) continue

    const trackTransitions = transitions.filter((t) => t.trackId === sorted[0]?.trackId)
    const hasTransitions = trackTransitions.length > 0

    if (sorted.length === 1) {
      const seg = sorted[0]
      const segLabel = segVideoLabels.get(seg.id) ?? nextLabel("trk")

      if (seg.timelineStart > 0.01) {
        const gapLabel = nextLabel("gap")
        const gapDur = seg.timelineStart
        filterParts.push(`color=black@0:s=${targetW}x${targetH}:d=${gapDur.toFixed(3)}:rate=${targetFps},format=rgba,setpts=PTS-STARTPTS,fps=${targetFps},setsar=1:1[${gapLabel}]`)
        const concatOut = nextLabel("trk")
        filterParts.push(`[${gapLabel}][${segLabel}]concat=n=2:v=1:a=0[${concatOut}]`)
        trackVideoLabels.set(trackOrder, normalizeTb(concatOut))
      } else {
        trackVideoLabels.set(trackOrder, segLabel)
      }
    } else if (!hasTransitions) {
      const concatItems: string[] = []
      let nextExpectedStart = 0

      for (let i = 0; i < sorted.length; i++) {
        const seg = sorted[i]
        const lbl = segVideoLabels.get(seg.id)
        if (!lbl) throw new Error(`Missing video label for segment ${seg.id}`)

        const gapBefore = seg.timelineStart - nextExpectedStart
        if (gapBefore > 0.01) {
          const gapLabel = nextLabel("gap")
          filterParts.push(`color=black@0:s=${targetW}x${targetH}:d=${gapBefore.toFixed(3)}:rate=${targetFps},format=rgba,setpts=PTS-STARTPTS,fps=${targetFps},setsar=1:1[${gapLabel}]`)
          concatItems.push(`[${gapLabel}]`)
        }

        concatItems.push(`[${lbl}]`)
        nextExpectedStart = seg.timelineEnd
      }

      const concatOut = nextLabel("trk")
      filterParts.push(`${concatItems.join("")}concat=n=${concatItems.length}:v=1:a=0[${concatOut}]`)
      trackVideoLabels.set(trackOrder, normalizeTb(concatOut))
    } else {
      let currentLabel = segVideoLabels.get(sorted[0].id) ?? nextLabel("trk")
      let currentDuration = segmentDuration(sorted[0])

      if (sorted[0].timelineStart > 0.01) {
        const gapDur = sorted[0].timelineStart
        const gapLabel = nextLabel("gap")
        filterParts.push(`color=black@0:s=${targetW}x${targetH}:d=${gapDur.toFixed(3)}:rate=${targetFps},format=rgba,setpts=PTS-STARTPTS,fps=${targetFps},setsar=1:1[${gapLabel}]`)
        const concatOut = nextLabel("trk")
        filterParts.push(`[${gapLabel}][${currentLabel}]concat=n=2:v=1:a=0[${concatOut}]`)
        currentLabel = normalizeTb(concatOut)
        currentDuration += gapDur
      }

      for (let i = 1; i < sorted.length; i++) {
        const segALabel = currentLabel
        const segBLabel = segVideoLabels.get(sorted[i].id) ?? nextLabel("segv")

        const gapBetween = sorted[i].timelineStart - sorted[i - 1].timelineEnd

        const transition = findTransitionBetween(sorted[i - 1], sorted[i], trackTransitions)

        if (gapBetween > 0.01 && !transition) {
          const gapLabel = nextLabel("gap")
          filterParts.push(`color=black@0:s=${targetW}x${targetH}:d=${gapBetween.toFixed(3)}:rate=${targetFps},format=rgba,setpts=PTS-STARTPTS,fps=${targetFps},setsar=1:1[${gapLabel}]`)
          const concatOut = nextLabel("trk")
          filterParts.push(`[${segALabel}][${gapLabel}][${segBLabel}]concat=n=3:v=1:a=0[${concatOut}]`)
          currentLabel = normalizeTb(concatOut)
          currentDuration += gapBetween + segmentDuration(sorted[i])
        } else if (transition) {
          const fadeDuration = transition.durationS
          const offset = Math.max(0, currentDuration - fadeDuration)
          const outLabel = nextLabel("tx")

          const xfadeName = resolveXfadeName(transition.typeCanonical)

          if (transition.clipARef && "synthetic" in transition.clipARef && transition.clipARef.synthetic === "black_silence") {
            filterParts.push(`[${segBLabel}]fade=t=in:st=0:d=${fadeDuration.toFixed(3)}[${outLabel}_fadein]`)
            const fadeOutLabel = `${outLabel}_fadein`
            currentLabel = normalizeTb(fadeOutLabel)
            currentDuration += segmentDuration(sorted[i])
          } else if (transition.clipBRef && "synthetic" in transition.clipBRef && transition.clipBRef.synthetic === "black_silence") {
            const fadeStart = Math.max(0, segmentDuration(sorted[i]) - fadeDuration)
            filterParts.push(`[${segALabel}]fade=t=out:st=${fadeStart.toFixed(3)}:d=${fadeDuration.toFixed(3)}[${outLabel}]`)
            currentLabel = normalizeTb(outLabel)
          } else {
            filterParts.push(`[${segALabel}][${segBLabel}]xfade=transition=${xfadeName}:duration=${fadeDuration.toFixed(3)}:offset=${offset.toFixed(3)}[${outLabel}]`)
            currentLabel = normalizeTb(outLabel)
            currentDuration = currentDuration + segmentDuration(sorted[i]) - fadeDuration
          }
        } else {
          const concatOut = nextLabel("trk")
          filterParts.push(`[${segALabel}][${segBLabel}]concat=n=2:v=1:a=0[${concatOut}]`)
          currentLabel = normalizeTb(concatOut)
          currentDuration += segmentDuration(sorted[i])
        }
      }

      trackVideoLabels.set(trackOrder, currentLabel)
    }

    // Pad each track to the full project duration with a transparent trailing gap.
    // Without this, tracks that end before the project ends will freeze their last
    // opaque frame — covering lower tracks for the remaining duration.
    const trackEnd = sorted[sorted.length - 1].timelineEnd
    const trailingGap = projectDuration - trackEnd
    if (trailingGap > 0.05) {
      const currentLabel = trackVideoLabels.get(trackOrder)!
      const gapLabel = nextLabel("gap")
      filterParts.push(`color=black@0:s=${targetW}x${targetH}:d=${trailingGap.toFixed(3)}:rate=${targetFps},format=rgba,setpts=PTS-STARTPTS,fps=${targetFps},setsar=1:1[${gapLabel}]`)
      const padOut = nextLabel("tpad")
      filterParts.push(`[${currentLabel}][${gapLabel}]concat=n=2:v=1:a=0[${padOut}]`)
      trackVideoLabels.set(trackOrder, normalizeTb(padOut))
    }
  }

  // ============================================================
  // Phase 6: Overlay multiple video tracks (bottom to top)
  // ============================================================
  // Preview z-index: lowest track.order is on TOP (zIndex = N - layerIndex).
  // To match: highest trackOrder should be the base (bottom), and progressively
  // lower trackOrders are overlaid on top. Reverse the array so the final
  // output (lowest trackOrder) is visually on top.
  const sortedTrackOrders = [...videoTrackGroups.keys()].sort((a, b) => a - b).reverse()
  let finalVideoLabel: string | null = null

  if (sortedTrackOrders.length === 1) {
    finalVideoLabel = trackVideoLabels.get(sortedTrackOrders[0]) ?? nextLabel("outv")
  } else if (sortedTrackOrders.length > 1) {
    let baseLabel = trackVideoLabels.get(sortedTrackOrders[0]) ?? nextLabel("overlay")
    for (let i = 1; i < sortedTrackOrders.length; i++) {
      const overlayLabel = trackVideoLabels.get(sortedTrackOrders[i]) ?? nextLabel("overlay")
      const outLabel = nextLabel("ovl")
      filterParts.push(
        `[${baseLabel}][${overlayLabel}]overlay=0:0:format=auto[${outLabel}]`,
      )
      baseLabel = outLabel
    }
    finalVideoLabel = baseLabel
  }

  // ============================================================
  // Phase 7: Convert final video to yuv420p for encoding
  // (RGBA alpha compositing between layers is now complete)
  // ============================================================
  if (finalVideoLabel) {
    const yuvLabel = nextLabel("yuv")
    filterParts.push(`[${finalVideoLabel}]format=yuv420p[${yuvLabel}]`)
    finalVideoLabel = yuvLabel
  }

  // ============================================================
  // Phase 8: Assemble audio
  // ============================================================
  let finalAudioLabel: string | null = null

  const audioLabels = [...segAudioLabels.values()]
  if (audioLabels.length === 1) {
    finalAudioLabel = audioLabels[0]
  } else if (audioLabels.length > 1) {
    finalAudioLabel = nextLabel("outa")
    const inputs = audioLabels.map((l) => `[${l}]`).join("")
    filterParts.push(`${inputs}amix=inputs=${audioLabels.length}:duration=longest:normalize=1[${finalAudioLabel}]`)
  }

  // ============================================================
  // Phase 8: Build output mapping
  // ============================================================
  const mappingArgs: string[] = []
  if (finalVideoLabel) {
    mappingArgs.push("-map", `[${finalVideoLabel}]`)
  }
  if (finalAudioLabel) {
    mappingArgs.push("-map", `[${finalAudioLabel}]`)
  }

  const filterComplex = filterParts.join(";\n")

  return {
    filterComplex,
    inputArgs,
    outputArgs: [],
    mappingArgs,
    estimatedFrames: plan.estimatedTotalFrames,
    inputIndexByMediaId,
    hasAudioOutput: finalAudioLabel !== null,
  }
}

function buildDrawtextFilter(seg: RenderSegment, scaleX: number, scaleY: number): string | null {
  if (!seg.content || seg.type !== "text") return null

  const s = seg.style
  if (!s) return null

  const text = seg.content.replace(/'/g, "'\\''")
  const fontSize = Math.round(s.fontSize * Math.min(scaleX, scaleY))
  const fontColor = s.color ?? "#ffffff"
  // Convert hex color to FFmpeg 0xRRGGBB format
  const ffmpegColor = fontColor.startsWith("#")
    ? fontColor.replace("#", "0x")
    : fontColor

  const t = seg.transform!
  const px = Math.round(t.x * scaleX)
  const py = Math.round(t.y * scaleY)
  const sw = Math.round(t.width * scaleX)
  const sh = Math.round(t.height * scaleY)

  // Horizontal alignment: drawtext text_align uses left/center/right
  const align = s.textAlign ?? "center"
  let xExpr: string
  if (align === "left") {
    xExpr = `${px}`
  } else if (align === "right") {
    xExpr = `${px} + ${sw} - text_w`
  } else {
    xExpr = `${px} + (${sw} - text_w)/2`
  }
  // Vertical center within the bounding box
  const yExpr = `${py} + (${sh} - text_h)/2`

  const alpha = s.opacity ?? 1

  // Build drawtext filter
  const parts: string[] = [
    `drawtext=text='${text}'`,
    `fontsize=${fontSize}`,
    `fontcolor=${ffmpegColor}`,
    `x=${xExpr}`,
    `y=${yExpr}`,
    `alpha=${alpha}`,
  ]

  // Background box
  if (s.backgroundColor) {
    const bgColor = s.backgroundColor.startsWith("#")
      ? s.backgroundColor.replace("#", "0x")
      : s.backgroundColor
    parts.push(`box=1`, `boxcolor=${bgColor}`)
  }

  // Bold/italic via expansion (limited FFmpeg support)
  if (s.bold) parts.push(`expansion=normal`)

  return parts.join(":")
}

function findTransitionBetween(
  segA: RenderSegment,
  segB: RenderSegment,
  transitions: RenderTransition[],
): RenderTransition | undefined {
  return transitions.find((t) => {
    const aId = "clipId" in t.clipARef ? t.clipARef.clipId : undefined
    const bId = "clipId" in t.clipBRef ? t.clipBRef.clipId : undefined
    return (aId === segA.clipId && bId === segB.clipId) ||
      (aId === segB.clipId && bId === segA.clipId)
  })
}

function resolveXfadeName(typeCanonical: string): string {
  const resolution = resolveCanonicalTransitionType(typeCanonical)
  return resolution.entry.exportMapping.ffmpegXfade
}

function buildAudioFilter(speed: number): string | null {
  return buildAudioSpeedFilter(speed)
}