import type { RenderJob, RenderSegment } from "../project/projectTypes"
import { buildEqFilter, buildShadowFilter, buildDefinitionFilter } from "../utils/colorAdjustmentFilters"
import { buildFullAudioFilterChain } from "../utils/audioFilters"
import { buildAudioSpeedFilter } from "../utils/speedFilters"
import { DEFAULT_SPEED } from "../constants/speed"
import { isGifFileName } from "./ffmpegUtils"
import { buildXfadeChains } from "./xfadeChainBuilder"
import { resolveCanonicalTransitionType } from "./transitionRegistry"

// The preview canvas coordinate space. All Transform values are in these units.
const CANVAS_WIDTH = 1280
const CANVAS_HEIGHT = 720

export interface FFmpegInputArg {
  filePath: string
  /** Optional ffmpeg args to place before this input's -i. */
  args?: string[]
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
  canvasW: number,
  canvasH: number,
  fps: number,
  inputFilePath: string,
): string[] {
  const speed = seg.speed ?? DEFAULT_SPEED
  const isStaticVisual = seg.type === 'image' || seg.type === 'text'
  const isAnimatedGif = seg.type === 'image' && isGifFileName(inputFilePath)
  const clipDuration = Math.max(0, seg.timelineEnd - seg.timelineStart)

  const filters: string[] = []

  if (isStaticVisual && !isAnimatedGif) {
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
  const pixelFormat = isStaticVisual ? 'rgba' : 'yuv420p'
  if (seg.type === 'image') {
    // Images should preserve authored aspect in export just like preview composition.
    filters.push(`scale=${canvasW}:${canvasH}:force_original_aspect_ratio=decrease:flags=lanczos`)
    filters.push(`pad=${canvasW}:${canvasH}:(ow-iw)/2:(oh-ih)/2:color=black@0`)
    filters.push(`setsar=1`)
  } else {
    filters.push(`scale=${canvasW}:${canvasH}:flags=bicubic`)
    filters.push(`setsar=1`)
  }
  filters.push(`format=${pixelFormat}`)

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
  // st=0: the fade starts at the clip's own beginning. overlapStartS is before the clip boundary
  // in absolute time, so (overlapStartS - timelineStart) would yield a negative st value.
  if (seg.resolvedTransitionIn?.kind === 'fade_from_black') {
    filters.push(`fade=t=in:st=0:d=${seg.resolvedTransitionIn.duration.toFixed(3)}`)
  }

  // Fade-out to black (transitionOut without following clip → fade_to_black)
  if (seg.resolvedTransitionOut?.kind === 'fade_to_black') {
    const fadeStart = (seg.resolvedTransitionOut.overlapStartS - seg.timelineStart).toFixed(3)
    filters.push(`fade=t=out:st=${fadeStart}:d=${seg.resolvedTransitionOut.duration.toFixed(3)}`)
  }

  return filters
}

function buildAudioSegmentFilters(seg: RenderSegment, overrideTimelineStart?: number): string[] {
  const speed = seg.speed ?? DEFAULT_SPEED
  const clipDuration = seg.timelineEnd - seg.timelineStart
  // Use compressed chain timing for xfade segments when provided.
  const effectiveStart = overrideTimelineStart ?? seg.timelineStart
  const delayMs = Math.floor(effectiveStart * 1000)

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
  // st=0: after atrim+asetpts=PTS-STARTPTS the audio PTS starts at 0, so the fade must
  // begin there. Using (overlapStartS - timelineStart) would give a negative st value.
  if (seg.resolvedTransitionIn?.kind === 'fade_from_black') {
    filters.push(`afade=t=in:st=0:d=${seg.resolvedTransitionIn.duration.toFixed(3)}`)
  }

  // Audio fade-in during crossfade (incoming clip)
  if (seg.resolvedTransitionIn?.kind === 'crossfade') {
    filters.push(`afade=t=in:st=0:d=${seg.resolvedTransitionIn.duration.toFixed(3)}:curve=qsin`)
  }

  // Audio fade-out to black
  if (seg.resolvedTransitionOut?.kind === 'fade_to_black') {
    const fadeStart = (seg.resolvedTransitionOut.overlapStartS - seg.timelineStart).toFixed(3)
    filters.push(`afade=t=out:st=${fadeStart}:d=${seg.resolvedTransitionOut.duration.toFixed(3)}`)
  }

  // Audio fade-out during crossfade (outgoing clip)
  if (seg.resolvedTransitionOut?.kind === 'crossfade') {
    const fadeStart = (seg.resolvedTransitionOut.overlapStartS - seg.timelineStart).toFixed(3)
    filters.push(`afade=t=out:st=${fadeStart}:d=${seg.resolvedTransitionOut.duration.toFixed(3)}:curve=iqsin`)
  }

  filters.push(`adelay=${delayMs}|${delayMs}`)
  return filters
}

function buildVideoSegmentFiltersForXfadeChain(
  seg: RenderSegment,
  canvasW: number,
  canvasH: number,
  canvasX: number,
  canvasY: number,
  fps: number,
  inputFilePath: string,
  canvasWidth: number,
  canvasHeight: number,
  outgoingHandleDuration: number,
): string[] {
  const speed = seg.speed ?? DEFAULT_SPEED
  const isAnimatedGif = seg.type === 'image' && isGifFileName(inputFilePath)
  const clipDuration = Math.max(0, seg.timelineEnd - seg.timelineStart)
  const handleDuration = Math.max(0, outgoingHandleDuration)

  const filters: string[] = []

  const isStaticVisual = seg.type === 'image' || seg.type === 'text'

  if (isStaticVisual && !isAnimatedGif) {
    filters.push(`loop=-1:size=1:start=0`)
    filters.push(`fps=${fps}`)
    filters.push(`trim=end=${(clipDuration + handleDuration).toFixed(3)}`)
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

    if (handleDuration > 0.0001) {
      // Keep authored timeline duration by synthesizing the missing outgoing
      // transition handle as a cloned final frame when source media is short.
      filters.push(`tpad=stop_mode=clone:stop_duration=${handleDuration.toFixed(3)}`)
    }
  }

  if (seg.type === 'image') {
    filters.push(`scale=${canvasW}:${canvasH}:force_original_aspect_ratio=decrease:flags=lanczos`)
    filters.push(`pad=${canvasW}:${canvasH}:(ow-iw)/2:(oh-ih)/2:color=black@0`)
    filters.push(`setsar=1`)
  } else {
    filters.push(`scale=${canvasW}:${canvasH}:flags=bicubic`)
    filters.push(`setsar=1`)
  }
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

  // Preserve authored fade transitions for clips that participate in xfade chains.
  // The chain-specific path previously skipped these, which made exported fades appear
  // as hard cuts even though preview playback rendered them correctly.
  if (seg.resolvedTransitionIn?.kind === 'fade_from_black') {
    filters.push(`fade=t=in:st=0:d=${seg.resolvedTransitionIn.duration.toFixed(3)}`)
  }

  if (seg.resolvedTransitionOut?.kind === 'fade_to_black') {
    const fadeStart = (seg.resolvedTransitionOut.overlapStartS - seg.timelineStart).toFixed(3)
    filters.push(`fade=t=out:st=${fadeStart}:d=${seg.resolvedTransitionOut.duration.toFixed(3)}`)
  }

  filters.push(`format=rgba`)
  filters.push(`fps=${fps}`)
  filters.push(`settb=1/90000`)
  filters.push(`pad=${canvasWidth}:${canvasHeight}:${canvasX}:${canvasY}:color=black@0`)
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

  const compositionWidth = CANVAS_WIDTH
  const compositionHeight = CANVAS_HEIGHT

  // Visual segments sorted background → foreground (highest trackOrder first)
  const visualSegments = job.segments
    .filter(s => s.type === 'video' || s.type === 'image' || s.type === 'text')
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
    ? ['-f', 'lavfi', '-i', `color=c=black:s=${compositionWidth}x${compositionHeight}:d=${duration}:r=${fps}`]
    : []

  const inputs: FFmpegInputArg[] = []

  const buildInputArg = (seg: RenderSegment): FFmpegInputArg => {
    const filePath = fileNames.get(seg.mediaId) ?? `media_${seg.mediaId}`
    // Animated GIFs should keep providing frames for the full clip duration.
    if (seg.type === 'image' && isGifFileName(filePath)) {
      return { filePath, args: ['-stream_loop', '-1'] }
    }
    return { filePath }
  }
  const filterParts: string[] = []
  // Tracks audio labels actually generated; used to set audioOutputLabel correctly.
  const audioLabels: string[] = []
  const xfadeChains = options.disableTransitions || !hasVideo ? [] : buildXfadeChains(visualSegments)
  // Canonical transition windows are absolute timeline values; for incoming
  // crossfade clips we shift audio start to overlapStartS so audio and video
  // transition windows remain aligned.
  const effectiveAudioStartMap = new Map<number, number>()
  for (const chain of xfadeChains) {
    for (const segIdx of chain.segmentIndexes) {
      const seg = visualSegments[segIdx]
      if (seg.resolvedTransitionIn?.kind === 'crossfade') {
        effectiveAudioStartMap.set(segIdx, seg.resolvedTransitionIn.overlapStartS)
      } else {
        effectiveAudioStartMap.set(segIdx, seg.timelineStart)
      }
    }
  }

  // Video filter chains
  if (hasVideo) {
    // Input 0 = base canvas (from baseArgs)
    // Inputs 1..P = visual segments, in compositing order (bg first)
    for (let i = 0; i < visualSegments.length; i++) {
      const seg = visualSegments[i]
      inputs.push(buildInputArg(seg))
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
    for (let chainIdx = 0; chainIdx < xfadeChains.length; chainIdx++) {
      const chain = xfadeChains[chainIdx]
      const outgoingHandleByIndex = new Map<number, number>()
      for (const boundary of chain.boundaries) {
        const prev = outgoingHandleByIndex.get(boundary.fromSegmentIndex) ?? 0
        outgoingHandleByIndex.set(boundary.fromSegmentIndex, Math.max(prev, boundary.duration))
      }

      // The last segment in a chain is only used as the second input to the final xfade.
      // It still needs tail padding equal to that final overlap, otherwise the composed
      // stream ends early and the base canvas shows black after the last transition.
      if (chain.boundaries.length > 0) {
        const lastBoundary = chain.boundaries[chain.boundaries.length - 1]
        const prev = outgoingHandleByIndex.get(lastBoundary.toSegmentIndex) ?? 0
        outgoingHandleByIndex.set(lastBoundary.toSegmentIndex, Math.max(prev, lastBoundary.duration))
      }

      for (const idx of chain.segmentIndexes) {
        const seg = visualSegments[idx]
        const inputIdx = idx + 1
        const t = seg.transform
        const canvasW = Math.max(1, Math.round(t?.width ?? CANVAS_WIDTH))
        const canvasH = Math.max(1, Math.round(t?.height ?? CANVAS_HEIGHT))
        const canvasX = Math.round(t?.x ?? 0)
        const canvasY = Math.round(t?.y ?? 0)
        const inputFilePath = fileNames.get(seg.mediaId) ?? `media_${seg.mediaId}`

        const prepLabel = `xprep_${idx}`
        const prepFilters = buildVideoSegmentFiltersForXfadeChain(
          seg,
          canvasW,
          canvasH,
          canvasX,
          canvasY,
          fps,
          inputFilePath,
          compositionWidth,
          compositionHeight,
          outgoingHandleByIndex.get(idx) ?? 0,
        )
        filterParts.push(`[${inputIdx}:v]${prepFilters.join(',')}[${prepLabel}]`)
        chainedIndexes.add(idx)
      }

      let currentLabel = `xprep_${chain.segmentIndexes[0]}`
      for (let b = 0; b < chain.boundaries.length; b++) {
        const boundary = chain.boundaries[b]
        const nextLabel = `xprep_${boundary.toSegmentIndex}`
        const outLabel = b === chain.boundaries.length - 1 ? `xchain_${chainIdx}` : `xchain_${chainIdx}_${b}`
        const transition = resolveCanonicalTransitionType(boundary.transition.type).entry.exportMapping.ffmpegXfade

        filterParts.push(
          `[${currentLabel}][${nextLabel}]xfade=transition=${transition}:duration=${boundary.duration}:offset=${boundary.offset},format=rgba[${outLabel}]`,
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
      const canvasW = Math.max(1, Math.round(t?.width ?? CANVAS_WIDTH))
      const canvasH = Math.max(1, Math.round(t?.height ?? CANVAS_HEIGHT))
      const canvasX = Math.round(t?.x ?? 0)
      const canvasY = Math.round(t?.y ?? 0)
      const inputFilePath = fileNames.get(seg.mediaId) ?? `media_${seg.mediaId}`

      const segFilters = buildVideoSegmentFilters(seg, canvasW, canvasH, fps, inputFilePath)
      const vLabel = `v${i}`
      filterParts.push(`[${inputIdx}:v]${segFilters.join(',')}[${vLabel}]`)

      overlaySources.push({
        label: `[${vLabel}]`,
        timelineStart: seg.timelineStart,
        timelineEnd: seg.timelineEnd,
        trackOrder: seg.trackOrder,
        x: canvasX,
        y: canvasY,
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
  // composition; convert to the requested output resolution after all overlays
  // are applied so preview-space transforms are preserved without stretching.
  let videoOutputLabel: string | null = hasVideo ? '[vout]' : null
  if (hasVideo) {
    filterParts.push(
      `[vout]scale=${W}:${H}:force_original_aspect_ratio=decrease:flags=bicubic,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p[vout_final]`,
    )
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
        const effectiveStart = effectiveAudioStartMap.get(i) ?? seg.timelineStart
        const aFilters = buildAudioSegmentFilters(seg, effectiveStart)
        filterParts.push(`[${inputIdx}:a]${aFilters.join(',')}[${aLabel}]`)
        audioLabels.push(`[${aLabel}]`)
      }
    }

    // Audio-only clips
    for (let i = 0; i < audioOnlySegments.length; i++) {
      const seg = audioOnlySegments[i]
      const inputIdx = audioOnlyOffset + i
      inputs.push(buildInputArg(seg))

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
