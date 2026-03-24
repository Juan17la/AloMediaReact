import type { RenderJob, RenderSegment } from "../project/projectTypes"
import { buildEqFilter, buildShadowFilter, buildDefinitionFilter } from "../utils/colorAdjustmentFilters"
import { buildFullAudioFilterChain } from "../utils/audioFilters"
import { buildAudioSpeedFilter } from "../utils/speedFilters"
import { DEFAULT_SPEED } from "../constants/speed"

// The preview canvas coordinate space. All Transform values are in these units.
const CANVAS_WIDTH = 1280
const CANVAS_HEIGHT = 720

export interface FFmpegInputArg {
  filePath: string
  isImage?: boolean
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
): string[] {
  const speed = seg.speed ?? DEFAULT_SPEED

  const filters: string[] = []

  if (seg.type === 'image') {
    // Static image: loop a single frame, set fps, trim to clip duration, shift to timeline
    const duration = (seg.timelineEnd - seg.timelineStart).toFixed(3)
    filters.push(`loop=1:size=1:start=0`)
    filters.push(`fps=25`)
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

  filters.push(`adelay=${delayMs}|${delayMs}`)
  return filters
}

export function buildFilterGraph(job: RenderJob): FilterGraphResult {
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

  // Video filter chains
  if (hasVideo) {
    // Input 0 = base canvas (from baseArgs)
    // Inputs 1..P = visual segments, in compositing order (bg first)
    for (let i = 0; i < visualSegments.length; i++) {
      inputs.push({ filePath: `media_${visualSegments[i].mediaId}`, isImage: visualSegments[i].type === 'image' })
    }

    let lastVideoLabel = '0:v'

    for (let i = 0; i < visualSegments.length; i++) {
      const seg = visualSegments[i]
      const inputIdx = i + 1 // +1 because input 0 is base canvas

      const t = seg.transform
      const scaledW = Math.round((t?.width ?? CANVAS_WIDTH) * scaleX)
      const scaledH = Math.round((t?.height ?? CANVAS_HEIGHT) * scaleY)
      const scaledX = Math.round((t?.x ?? 0) * scaleX)
      const scaledY = Math.round((t?.y ?? 0) * scaleY)

      const segFilters = buildVideoSegmentFilters(seg, scaledW, scaledH)
      const vLabel = `v${i}`
      filterParts.push(`[${inputIdx}:v]${segFilters.join(',')}[${vLabel}]`)

      const outLabel = i === visualSegments.length - 1 ? 'vout' : `comp${i}`
      filterParts.push(
        `[${lastVideoLabel}][${vLabel}]overlay=x=${scaledX}:y=${scaledY}:eof_action=pass:enable='between(t,${seg.timelineStart},${seg.timelineEnd})'[${outLabel}]`,
      )
      lastVideoLabel = outLabel
    }
  }

  // Audio filter chains 
  if (hasAudio) {
    const audioLabels: string[] = []
    // Audio-only segment inputs start after visual segment inputs
    const audioOnlyOffset = hasVideo ? visualSegments.length + 1 : 0

    // Audio from video clips (share the same input index as the visual segment)
    for (let i = 0; i < visualSegments.length; i++) {
      const seg = visualSegments[i]
      if (seg.type !== 'video') continue // images have no audio stream

      const inputIdx = hasVideo ? i + 1 : i
      const aLabel = `av${i}`
      const aFilters = buildAudioSegmentFilters(seg)
      filterParts.push(`[${inputIdx}:a]${aFilters.join(',')}[${aLabel}]`)
      audioLabels.push(`[${aLabel}]`)
    }

    // Audio-only clips
    for (let i = 0; i < audioOnlySegments.length; i++) {
      const seg = audioOnlySegments[i]
      const inputIdx = audioOnlyOffset + i
      inputs.push({ filePath: `media_${seg.mediaId}` })

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
    videoOutputLabel: hasVideo ? '[vout]' : null,
    audioOutputLabel: hasAudio ? '[aout]' : null,
  }
}
