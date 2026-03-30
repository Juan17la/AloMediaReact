import type { RenderJob, RenderSegment } from "../project/projectTypes"
import { buildEqFilter, buildShadowFilter, buildDefinitionFilter } from "../utils/colorAdjustmentFilters"
import { buildFullAudioFilterChain } from "../utils/audioFilters"
import { buildAudioSpeedFilter } from "../utils/speedFilters"
import { DEFAULT_SPEED } from "../constants/speed"
import { isGifFileName } from "./ffmpegUtils"
import { buildXfadeChains } from "./xfadeChainBuilder"
import { normalizeTransitionType } from "../utils/transitions"

// The preview canvas coordinate space. All Transform values are in these units.
const CANVAS_WIDTH = 1280
const CANVAS_HEIGHT = 720

export interface FFmpegInputArg {
  filePath: string
}

export interface FilterGraphResult {
  /** Args for the synthetic base canvas, prepended before all other inputs. Empty if no video. */
  baseArgs: string[]
  /** Ordered list of media file inputs (after the base canvas). */
  inputs: FFmpegInputArg[]
  /** The full -filter_complex value. */
  filterComplex: string
  /** Map label for video output stream, or null if no video segments. */
  videoOutputLabel: string | null
  /** Map label for audio output stream, or null if no audio segments. */
  audioOutputLabel: string | null
}

function buildVideoSegmentFilters(
  seg: RenderSegment,
  scaledW: number,
  scaledH: number,
  fps: number,
  inputFilePath: string,
): string[] {
  const speed = seg.speed ?? DEFAULT_SPEED
  const isAnimatedGif = seg.type === 'image' && isGifFileName(inputFilePath)
  const clipDuration = Math.max(0, seg.timelineEnd - seg.timelineStart)

  const filters: string[] = []

  if (seg.type === 'image' && !isAnimatedGif) {
    // Static image: loop a single frame, set fps, trim to clip duration, shift to timeline
    const duration = clipDuration.toFixed(3)
    filters.push(`loop=-1:size=1:start=0`)
    filters.push(`fps=${fps}`)
    filters.push(`trim=end=${duration}`)
    filters.push(`setpts=PTS-STARTPTS+${seg.timelineStart}/TB`)
  } else {
    // Video: trim to media range, apply speed, shift to timeline position
    if (Math.abs(speed - DEFAULT_SPEED) < 0.001) {
      filters.push(`trim=start=${seg.mediaStart}:end=${seg.mediaEnd}`)
      filters.push(`setpts=PTS-STARTPTS+${seg.timelineStart}/TB`)
    } else {
      const invSpeed = (1 / speed).toFixed(6)
      filters.push(`trim=start=${seg.mediaStart}:end=${seg.mediaEnd}`)
      filters.push(`setpts=(PTS-STARTPTS)*${invSpeed}+${seg.timelineStart}/TB`)
    }
  }

  // Keep alpha for image overlays (e.g. PNG/GIF transparency), use yuv420p for videos.
  const pixelFormat = seg.type === 'image' ? 'rgba' : 'yuv420p'
  filters.push(`scale=${scaledW}:${scaledH},format=${pixelFormat}`)

  if (seg.colorAdjustments) {
    const eq = buildEqFilter(seg.colorAdjustments)
    const shadow = buildShadowFilter(seg.colorAdjustments)
    const def = buildDefinitionFilter(seg.colorAdjustments)
    if (eq) filters.push(eq)
    if (shadow) filters.push(shadow)
    if (def) filters.push(def)
  }

  const rotation = seg.transform?.rotation ?? 0
  if (Math.abs(rotation) > 0.001) {
    const radians = (rotation * Math.PI) / 180
    filters.push(`rotate=${radians.toFixed(6)}:fillcolor=black@0`)
  }

  // Fade-in from black (transitionIn without preceding clip → fade_from_black)
  if (seg.resolvedTransitionIn?.kind === 'fade_from_black') {
    const fadeStart = (seg.resolvedTransitionIn.overlapStartS - seg.timelineStart).toFixed(3)
    filters.push(`fade=t=in:st=${fadeStart}:d=${seg.resolvedTransitionIn.duration.toFixed(3)}`)
  }

  // Fade-out to black (transitionOut without following clip → fade_to_black)
  if (seg.resolvedTransitionOut?.kind === 'fade_to_black') {
    const fadeStart = (seg.resolvedTransitionOut.overlapStartS - seg.timelineStart).toFixed(3)
    filters.push(`fade=t=out:st=${fadeStart}:d=${seg.resolvedTransitionOut.duration.toFixed(3)}`)
  }

  return filters
}

function buildAudioSegmentFilters(seg: RenderSegment): string[] {
  const speed = seg.speed ?? DEFAULT_SPEED
  const clipDuration = seg.timelineEnd - seg.timelineStart
  const delayMs = Math.floor(seg.timelineStart * 1000)

  const filters: string[] = [
    `atrim=start=${seg.mediaStart}:end=${seg.mediaEnd}`,
    `asetpts=PTS-STARTPTS`,
  ]

  const speedFilter = buildAudioSpeedFilter(speed)
  if (speedFilter) filters.push(speedFilter)

  if (seg.audioConfig) {
    const chain = buildFullAudioFilterChain(seg.audioConfig, clipDuration)
    if (chain) filters.push(chain)
  }

  // Audio fade-in from black
  if (seg.resolvedTransitionIn?.kind === 'fade_from_black') {
    const fadeStart = (seg.resolvedTransitionIn.overlapStartS - seg.timelineStart).toFixed(3)
    filters.push(`afade=t=in:st=${fadeStart}:d=${seg.resolvedTransitionIn.duration.toFixed(3)}`)
  }

  // Audio fade-in during crossfade (incoming clip)
  if (seg.resolvedTransitionIn?.kind === 'crossfade') {
    filters.push(`afade=t=in:st=0:d=${seg.resolvedTransitionIn.duration.toFixed(3)}`)
  }

  // Audio fade-out to black
  if (seg.resolvedTransitionOut?.kind === 'fade_to_black') {
    const fadeStart = (seg.resolvedTransitionOut.overlapStartS - seg.timelineStart).toFixed(3)
    filters.push(`afade=t=out:st=${fadeStart}:d=${seg.resolvedTransitionOut.duration.toFixed(3)}`)
  }

  // Audio fade-out during crossfade (outgoing clip)
  if (seg.resolvedTransitionOut?.kind === 'crossfade') {
    const fadeStart = (seg.resolvedTransitionOut.overlapStartS - seg.timelineStart).toFixed(3)
    filters.push(`afade=t=out:st=${fadeStart}:d=${seg.resolvedTransitionOut.duration.toFixed(3)}`)
  }

  filters.push(`adelay=${delayMs}|${delayMs}`)
  return filters
}

function buildVideoSegmentFiltersForXfadeChain(
  seg: RenderSegment,
  scaledW: number,
  scaledH: number,
  scaledX: number,
  scaledY: number,
  fps: number,
  inputFilePath: string,
  canvasWidth: number,
  canvasHeight: number,
): string[] {
  const speed = seg.speed ?? DEFAULT_SPEED
  const isAnimatedGif = seg.type === 'image' && isGifFileName(inputFilePath)
  const clipDuration = Math.max(0, seg.timelineEnd - seg.timelineStart)

  const filters: string[] = []

  if (seg.type === 'image' && !isAnimatedGif) {
    filters.push(`loop=-1:size=1:start=0`)
    filters.push(`fps=${fps}`)
    filters.push(`trim=end=${clipDuration.toFixed(3)}`)
    filters.push(`setpts=PTS-STARTPTS`)
  } else {
    if (Math.abs(speed - DEFAULT_SPEED) < 0.001) {
      filters.push(`trim=start=${seg.mediaStart}:end=${seg.mediaEnd}`)
      filters.push(`setpts=PTS-STARTPTS`)
    } else {
      const invSpeed = (1 / speed).toFixed(6)
      filters.push(`trim=start=${seg.mediaStart}:end=${seg.mediaEnd}`)
      filters.push(`setpts=(PTS-STARTPTS)*${invSpeed}`)
    }
  }

  filters.push(`scale=${scaledW}:${scaledH}`)
  if (seg.colorAdjustments) {
    const eq = buildEqFilter(seg.colorAdjustments)
    const shadow = buildShadowFilter(seg.colorAdjustments)
    const def = buildDefinitionFilter(seg.colorAdjustments)
    if (eq) filters.push(eq)
    if (shadow) filters.push(shadow)
    if (def) filters.push(def)
  }

  const rotation = seg.transform?.rotation ?? 0
  if (Math.abs(rotation) > 0.001) {
    const radians = (rotation * Math.PI) / 180
    filters.push(`rotate=${radians.toFixed(6)}:fillcolor=black@0`)
  }

  filters.push(`format=rgba`)
  filters.push(`pad=${canvasWidth}:${canvasHeight}:${scaledX}:${scaledY}:color=black@0`)
  return filters
}

export function buildFilterGraph(
  job: RenderJob,
  fileNames: Map<string, string>,
  options: { skipVideoAudio?: boolean; disableTransitions?: boolean } = {},
): FilterGraphResult {
  const { width: W, height: H } = job.resolution
  const fps = job.fps
  const duration = job.projectDuration

  const scaleX = W / CANVAS_WIDTH
  const scaleY = H / CANVAS_HEIGHT

  // Visual segments sorted background → foreground (highest trackOrder first)
  const visualSegments = job.segments
    .filter(s => s.type === 'video' || s.type === 'image')
    .sort((a, b) => {
      const orderDiff = b.trackOrder - a.trackOrder
      return orderDiff !== 0 ? orderDiff : a.timelineStart - b.timelineStart
    })

  // Audio-only segments (type === 'audio')
  const audioOnlySegments = job.segments.filter(s => s.type === 'audio')

  const hasVideo = visualSegments.length > 0
  // Audio exists if there are audio-only clips OR video clips (which carry audio)
  const hasAudio = audioOnlySegments.length > 0 || visualSegments.some(s => s.type === 'video')

  if (!hasVideo && !hasAudio) {
    return { baseArgs: [], inputs: [], filterComplex: '', videoOutputLabel: null, audioOutputLabel: null }
  }

  const baseArgs: string[] = hasVideo
    ? ['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:d=${duration}:r=${fps}`]
    : []

  const inputs: FFmpegInputArg[] = []
  const filterParts: string[] = []
  // Tracks audio labels actually generated; used to set audioOutputLabel correctly.
  const audioLabels: string[] = []

  // Video filter chains
  if (hasVideo) {
    // Input 0 = base canvas (from baseArgs)
    // Inputs 1..P = visual segments, in compositing order (bg first)
    for (let i = 0; i < visualSegments.length; i++) {
      const seg = visualSegments[i]
      inputs.push({
        filePath: fileNames.get(seg.mediaId) ?? `media_${seg.mediaId}`,
      })
    }

    type OverlaySource = {
      label: string
      timelineStart: number
      timelineEnd: number
      trackOrder: number
      x: number
      y: number
    }

    const chainedIndexes = new Set<number>()
    const overlaySources: OverlaySource[] = []
    const xfadeChains = options.disableTransitions ? [] : buildXfadeChains(visualSegments)

    for (let chainIdx = 0; chainIdx < xfadeChains.length; chainIdx++) {
      const chain = xfadeChains[chainIdx]

      for (const idx of chain.segmentIndexes) {
        const seg = visualSegments[idx]
        const inputIdx = idx + 1
        const t = seg.transform
        const scaledW = Math.round((t?.width ?? CANVAS_WIDTH) * scaleX / 2) * 2
        const scaledH = Math.round((t?.height ?? CANVAS_HEIGHT) * scaleY / 2) * 2
        const scaledX = Math.round((t?.x ?? 0) * scaleX)
        const scaledY = Math.round((t?.y ?? 0) * scaleY)
        const inputFilePath = fileNames.get(seg.mediaId) ?? `media_${seg.mediaId}`

        const prepLabel = `xprep_${idx}`
        const prepFilters = buildVideoSegmentFiltersForXfadeChain(
          seg,
          scaledW,
          scaledH,
          scaledX,
          scaledY,
          fps,
          inputFilePath,
          W,
          H,
        )
        filterParts.push(`[${inputIdx}:v]${prepFilters.join(',')}[${prepLabel}]`)
        chainedIndexes.add(idx)
      }

      let currentLabel = `xprep_${chain.segmentIndexes[0]}`
      for (let b = 0; b < chain.boundaries.length; b++) {
        const boundary = chain.boundaries[b]
        const nextLabel = `xprep_${boundary.toSegmentIndex}`
        const outLabel = b === chain.boundaries.length - 1 ? `xchain_${chainIdx}` : `xchain_${chainIdx}_${b}`
        const transition = normalizeTransitionType(boundary.transition.type)

        filterParts.push(
          `[${currentLabel}][${nextLabel}]xfade=transition=${transition}:duration=${boundary.duration}:offset=${boundary.offset}[${outLabel}]`,
        )
        currentLabel = outLabel
      }

      overlaySources.push({
        label: `[${currentLabel}]`,
        timelineStart: chain.timelineStart,
        timelineEnd: chain.timelineEnd,
        trackOrder: chain.trackOrder,
        x: 0,
        y: 0,
      })
    }

    let lastVideoLabel = '0:v'

    for (let i = 0; i < visualSegments.length; i++) {
      if (chainedIndexes.has(i)) continue

      const seg = visualSegments[i]
      const inputIdx = i + 1 // +1 because input 0 is base canvas

      const t = seg.transform
      // Round to nearest even number: libx264 rejects odd-sized dimensions
      const scaledW = Math.round((t?.width ?? CANVAS_WIDTH) * scaleX / 2) * 2
      const scaledH = Math.round((t?.height ?? CANVAS_HEIGHT) * scaleY / 2) * 2
      const scaledX = Math.round((t?.x ?? 0) * scaleX)
      const scaledY = Math.round((t?.y ?? 0) * scaleY)
      const inputFilePath = fileNames.get(seg.mediaId) ?? `media_${seg.mediaId}`

      const segFilters = buildVideoSegmentFilters(seg, scaledW, scaledH, fps, inputFilePath)
      const vLabel = `v${i}`
      filterParts.push(`[${inputIdx}:v]${segFilters.join(',')}[${vLabel}]`)

      overlaySources.push({
        label: `[${vLabel}]`,
        timelineStart: seg.timelineStart,
        timelineEnd: seg.timelineEnd,
        trackOrder: seg.trackOrder,
        x: scaledX,
        y: scaledY,
      })
    }

    overlaySources.sort((a, b) => {
      const orderDiff = b.trackOrder - a.trackOrder
      return orderDiff !== 0 ? orderDiff : a.timelineStart - b.timelineStart
    })

    for (let i = 0; i < overlaySources.length; i++) {
      const source = overlaySources[i]

      const outLabel = i === overlaySources.length - 1 ? 'vout' : `comp${i}`
      filterParts.push(
        `[${lastVideoLabel}]${source.label}overlay=x=${source.x}:y=${source.y}:eof_action=pass:enable='between(t,${source.timelineStart},${source.timelineEnd})'[${outLabel}]`,
      )
      lastVideoLabel = outLabel
    }
  }

  // Ensure final composed video stream has a pixel format compatible with
  // common encoders (e.g. libx264 expects yuv420p). Intermediate image
  // overlays keep alpha (rgba) so PNG transparency is preserved during
  // composition; convert to yuv420p after all overlays are applied.
  let videoOutputLabel: string | null = hasVideo ? '[vout]' : null
  if (hasVideo) {
    filterParts.push(`[vout]format=yuv420p[vout_final]`)
    videoOutputLabel = '[vout_final]'
  }

  // Audio filter chains
  if (hasAudio) {
    // Audio-only segment inputs start after visual segment inputs
    const audioOnlyOffset = hasVideo ? visualSegments.length + 1 : 0

    // Audio from video clips (share the same input index as the visual segment).
    // Skipped when skipVideoAudio=true (fallback for video files with no audio stream).
    if (!options.skipVideoAudio) {
      for (let i = 0; i < visualSegments.length; i++) {
        const seg = visualSegments[i]
        if (seg.type !== 'video') continue // images have no audio stream

        const inputIdx = hasVideo ? i + 1 : i
        const aLabel = `av${i}`
        const aFilters = buildAudioSegmentFilters(seg)
        filterParts.push(`[${inputIdx}:a]${aFilters.join(',')}[${aLabel}]`)
        audioLabels.push(`[${aLabel}]`)
      }
    }

    // Audio-only clips
    for (let i = 0; i < audioOnlySegments.length; i++) {
      const seg = audioOnlySegments[i]
      const inputIdx = audioOnlyOffset + i
      inputs.push({ filePath: fileNames.get(seg.mediaId) ?? `media_${seg.mediaId}` })

      const aLabel = `ao${i}`
      const aFilters = buildAudioSegmentFilters(seg)
      filterParts.push(`[${inputIdx}:a]${aFilters.join(',')}[${aLabel}]`)
      audioLabels.push(`[${aLabel}]`)
    }

    if (audioLabels.length > 0) {
      filterParts.push(
        `${audioLabels.join('')}amix=inputs=${audioLabels.length}:normalize=0[aout]`,
      )
    }
  }

  return {
    baseArgs,
    inputs,
    filterComplex: filterParts.join(';'),
    videoOutputLabel: videoOutputLabel,
    // Only set audioOutputLabel when [aout] was actually created in the filter complex.
    // hasAudio being true does NOT guarantee [aout] exists (video may have no audio stream).
    audioOutputLabel: audioLabels.length > 0 ? '[aout]' : null,
  }
}
