export type MediaType = "video" | "audio" | "image" | "subtitles"
export type TrackType = "video" | "audio"

export interface Media {
  id: string
  name: string
  type: MediaType
  format: string
  duration: number | null
  size: number
  hash: string // SHA-256 hex, used for deduplication
}

export interface Transform {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

export interface ColorAdjustments {
  brightness: number  // -1.0 to 1.0, default 0
  contrast: number    // -1.0 to 1.0, default 0 (maps to FFmpeg 1.0 neutral)
  saturation: number  // 0.0 to 3.0, default 1
  gamma: number       // 0.1 to 10.0, default 1
  exposure: number    // -3.0 to 3.0, default 0
  shadow?: number     // -1.0 to 1.0, default 0 (lifts or crushes dark tones)
  definition?: number // -1.0 to 1.0, default 0 (local midtone contrast via unsharp)
}

export interface AudioConfig {
  volume: number           // 0.0 to 2.0, default 1.0 (1.0 = unity gain, no change)
  muted: boolean           // default false
  fadeInDuration: number   // seconds, 0.0 to 10.0, default 0
  fadeOutDuration: number  // seconds, 0.0 to 10.0, default 0
  balance: number          // -1.0 (full left) to 1.0 (full right), default 0 (center)
}

export type XfadeTransitionType =
  | "fade"
  | "wipeleft"
  | "wiperight"
  | "slideleft"
  | "slideright"
  | "circlecrop"
  | "distance"
  | (string & {})

export interface ClipTransition {
  type: XfadeTransitionType
  duration: number // seconds
}

export type TransitionSourceReason =
  | "legacyOut"
  | "legacyIn"
  | "synthesizedStart"
  | "synthesizedEnd"
  | "conflictResolved"

export interface SyntheticTransitionEndpoint {
  kind: "black_silence"
}

export interface TransitionEdge {
  edgeId: string
  trackId: string
  clipAId?: string
  clipBId?: string
  syntheticA?: SyntheticTransitionEndpoint
  syntheticB?: SyntheticTransitionEndpoint
  boundaryTimeS: number
  startTimeS: number
  endTimeS: number
  durationS: number
  transitionTypeCanonical: string
  params: Record<string, unknown>
  sourceReason: TransitionSourceReason
}

export interface TransitionClipRef {
  clipId?: string
  synthetic?: SyntheticTransitionEndpoint
}

export type TransitionAudioCurveType = "equal_power"

export interface CompiledTransition {
  transitionId: string
  trackId: string
  clipARef: TransitionClipRef
  clipBRef: TransitionClipRef
  startTimeS: number
  endTimeS: number
  boundaryTimeS: number
  durationS: number
  typeCanonical: string
  normalizedParams: Record<string, unknown>
  audioCurveType: TransitionAudioCurveType
  debugFields: {
    edgeId: string
    sourceReason: TransitionSourceReason
    requestedDurationS: number
    clampedDurationS: number
    requestedType: string
    normalizedType: boolean
    fallbackReason: string
  }
}

export interface BaseClip {
  id: string
  trackId: string
  // All time fields below are stored in seconds, rounded to the nearest millisecond.
  // Always write through toMs/toSeconds from utils/time.ts to guarantee bitwise-identical boundaries.
  timelineStart: number // seconds (integer-ms precision)
  timelineEnd: number   // seconds (integer-ms precision)
}

export interface VideoClip extends BaseClip {
  type: "video"
  mediaId: string
  mediaStart: number // seconds (integer-ms precision)
  mediaEnd: number   // seconds (integer-ms precision)
  volume: number
  speed?: number
  transform: Transform
  colorAdjustments?: ColorAdjustments
  audioConfig?: AudioConfig
  transitionIn?: ClipTransition   // transition at the START of this clip
  transitionOut?: ClipTransition  // transition at the END of this clip
}

export interface ImageClip extends BaseClip {
  type: "image"
  mediaId: string
  transform: Transform
  colorAdjustments?: ColorAdjustments
}

export interface TextStyle {
  fontSize: number                          // px in canvas space, default 48
  fontFamily: string                        // CSS font-family value, default "Inter, sans-serif"
  color: string                             // CSS color, default "#ffffff"
  backgroundColor?: string                  // CSS color, undefined = transparent
  textAlign: "left" | "center" | "right"   // default "center"
  opacity: number                           // 0.0 to 1.0, default 1
  bold: boolean                             // default false
  italic: boolean                           // default false
}

export interface TextClip extends BaseClip {
  type: "text"
  content: string
  transform: Transform
  style: TextStyle
}

export interface AudioClip extends BaseClip {
  type: "audio"
  mediaId: string
  mediaStart: number // seconds (integer-ms precision)
  mediaEnd: number   // seconds (integer-ms precision)
  volume: number
  speed?: number
  audioConfig?: AudioConfig
}

export type Clip = VideoClip | ImageClip | TextClip | AudioClip

export interface Track {
  id: string
  type: TrackType
  order: number
  clips: Clip[]
}

export interface ClipGroup {
  id: string
  name?: string
  memberClipIds: string[]
  locked: boolean
  visible: boolean
  createdAt: number
}

export interface Project {
  id: string
  name: string
  media: Media[]
  tracks: Track[]
  transitionEdges?: TransitionEdge[]
  clipGroups?: ClipGroup[]
}

// Project.duration is always derived — never stored.
// Use getProjectDuration(tracks) from utils/time.ts

export interface HistoryEntry {
  project: Project
  description: string
}

export interface EditorState {
  project: Project
  selectedClipId?: string
  selectedClipIds?: string[]
  activeGroupId?: string
  groupEditGroupId?: string
  selectedTransitionClipId?: string
  selectedTrackId?: string
  playhead: number
  timelineScale: number // px per second, default 50
  isPlaying: boolean
  history: HistoryEntry[]
  historyIndex: number
}

export interface SavedProject {
  project: Project
  version: number
  createdAt: number
  updatedAt: number
}

export interface ResolvedTransition {
  type: XfadeTransitionType
  duration: number          // seconds
  overlapStartS: number     // seconds, absolute timeline position
  kind: 'crossfade' | 'fade_to_black' | 'fade_from_black'
}

export interface RenderSegment {
  clipId: string
  mediaId: string
  mediaStart: number
  mediaEnd: number
  timelineStart: number
  timelineEnd: number
  speed: number
  type: "video" | "audio" | "image" | "text"
  trackId: string
  trackOrder: number
  trackType: TrackType
  transform?: Transform
  volume?: number
  colorAdjustments?: ColorAdjustments
  audioConfig?: AudioConfig
  content?: string
  style?: TextStyle
  transitionIn?: ClipTransition
  transitionOut?: ClipTransition
  resolvedTransitionIn?: ResolvedTransition
  resolvedTransitionOut?: ResolvedTransition
}

export type ExportOutputFormat = "mp4" | "mov" | "mkv" | "avi"
export type ExportVideoCodec = "h264" | "vp9" | "av1"

export interface RenderJob {
  segments: RenderSegment[]
  transitions: CompiledTransition[]
  outputFormat: ExportOutputFormat
  codec?: ExportVideoCodec
  resolution: { width: number; height: number }
  fps: number
  outputFileName: string
  projectDuration: number
}
