import type {
  AudioConfig,
  ColorAdjustments,
  ExportOutputFormat,
  ExportVideoCodec,
  TrackType,
  Transform,
  TextStyle,
} from "../../project/projectTypes"

export type EncodingPreset = "fast" | "medium" | "slow"

export type JobStatus =
  | "pending"
  | "probing"
  | "planning"
  | "encoding"
  | "merging"
  | "finalizing"
  | "done"
  | "failed"
  | "cancelled"

export interface OutputTarget {
  format: ExportOutputFormat
  codec: ExportVideoCodec
  resolution: { width: number; height: number }
  fps: number
  videoBitrate: number | null
  crf: number
  preset: string
  tune: string | null
  audioCodec: string
  audioBitrate: number
  container: string
  pixelFormat: string
}

export interface MediaProbeResult {
  mediaId: string
  fileHash: string
  codec: string
  width: number
  height: number
  fps: number
  duration: number
  isVfr: boolean
  pixelFormat: string | null
  audioCodec: string | null
  audioSampleRate: number | null
  audioChannels: number | null
  audioBitrate: number | null
  fileExtension: string
}

export interface RenderSegment {
  id: string
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
  transform: Transform | null
  colorAdjustments: ColorAdjustments | null
  audioConfig: AudioConfig | null
  volume: number | null
  content?: string
  style?: TextStyle
}

export interface RenderTransition {
  transitionId: string
  trackId: string
  clipARef: { clipId: string } | { synthetic: "black_silence" }
  clipBRef: { clipId: string } | { synthetic: "black_silence" }
  startTimeS: number
  endTimeS: number
  durationS: number
  boundaryTimeS: number
  typeCanonical: string
  audioCurveType: "equal_power"
}

export interface StreamCopySegment {
  mediaId: string
  mediaStart: number
  mediaEnd: number
  timelineStart: number
  timelineEnd: number
  codec: string
}

export interface RenderPlan {
  id: string
  createdAt: number
  projectDuration: number
  outputTarget: OutputTarget
  segments: RenderSegment[]
  transitions: RenderTransition[]
  probeResults: MediaProbeResult[]
  canStreamCopy: boolean
  streamCopySegments: StreamCopySegment[]
  estimatedTotalFrames: number
  mediaFileNames: Map<string, string>
}

export interface ExportJob {
  id: string
  plan: RenderPlan
  status: JobStatus
  progress: number
  framesProcessed: number
  framesTotal: number
  startedAt: number | null
  completedAt: number | null
  error: string | null
  outputUrl: string | null
  engine: "wasm" | "server"
}

export interface FilterGraphResult {
  filterComplex: string
  inputArgs: string[]
  outputArgs: string[]
  mappingArgs: string[]
  estimatedFrames: number
  inputIndexByMediaId: Map<string, number>
}

export interface ExportPipelineCallbacks {
  onProgress: (progress: ExportPipelineProgress) => void
  onComplete: (blob: Blob) => void
  onError: (error: string) => void
}

export interface ExportPipelineProgress {
  stage: JobStatus
  percent: number
  framesProcessed: number
  framesTotal: number
  secondsRemaining: number | null
  errorMessage: string | null
}

export interface EngineCapabilities {
  available: boolean
  gpuAccel: boolean
  gpuCodec: string | null
  maxConcurrentJobs: number
}