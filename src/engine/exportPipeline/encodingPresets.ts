import type { EncodingPreset, OutputTarget } from "./types"
import type { ExportOutputFormat, ExportVideoCodec } from "../../project/projectTypes"

export interface EncodingPresetConfig {
  label: string
  codec: ExportVideoCodec
  crf: number
  preset: string
  tune: string | null
  audioBitrate: number
  audioCodec: string
  pixelFormat: string
  description: string
}

export const ENCODING_PRESETS: Record<EncodingPreset, EncodingPresetConfig> = {
  fast: {
    label: "Fast",
    codec: "h264",
    crf: 30,
    preset: "ultrafast",
    tune: "zerolatency",
    audioBitrate: 128,
    audioCodec: "aac",
    pixelFormat: "yuv420p",
    description: "Preview quality, fastest encode",
  },
  medium: {
    label: "Medium",
    codec: "h264",
    crf: 26,
    preset: "fast",
    tune: null,
    audioBitrate: 192,
    audioCodec: "aac",
    pixelFormat: "yuv420p",
    description: "Good quality, reasonable speed",
  },
  slow: {
    label: "Slow",
    codec: "h264",
    crf: 22,
    preset: "medium",
    tune: null,
    audioBitrate: 256,
    audioCodec: "aac",
    pixelFormat: "yuv420p",
    description: "High quality, longer encode",
  },
}

export const GPU_ENCODING_PRESETS: Record<EncodingPreset, { codec: string; preset: string; crf: number; audioBitrate: number }> = {
  fast: {
    codec: "h264_nvenc",
    preset: "p1",
    crf: 30,
    audioBitrate: 128,
  },
  medium: {
    codec: "h264_nvenc",
    preset: "p4",
    crf: 26,
    audioBitrate: 192,
  },
  slow: {
    codec: "h264_nvenc",
    preset: "p7",
    crf: 22,
    audioBitrate: 256,
  },
}

export const QSV_ENCODING_PRESETS: Record<EncodingPreset, { codec: string; preset: string; crf: number; audioBitrate: number }> = {
  fast: {
    codec: "h264_qsv",
    preset: "veryfast",
    crf: 30,
    audioBitrate: 128,
  },
  medium: {
    codec: "h264_qsv",
    preset: "medium",
    crf: 26,
    audioBitrate: 192,
  },
  slow: {
    codec: "h264_qsv",
    preset: "slow",
    crf: 22,
    audioBitrate: 256,
  },
}

const CONTAINER_MAP: Record<ExportOutputFormat, string> = {
  mp4: "mp4",
  mov: "mov",
  mkv: "matroska",
  avi: "avi",
}

const MIME_MAP: Record<ExportOutputFormat, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
}

const FAST_CODEC_ARGS: Record<ExportVideoCodec, string[]> = {
  h264: ["-profile:v", "baseline", "-level", "3.1"],
  vp9: ["-row-mt", "1", "-threads", "4"],
  av1: ["-cpu-used", "8", "-row-mt", "1"],
}

export function buildOutputTarget(
  format: ExportOutputFormat,
  codec: ExportVideoCodec,
  resolution: { width: number; height: number },
  fps: number,
  preset: EncodingPreset,
  useGpu: boolean = false,
  gpuCodec: string | null = null,
): OutputTarget {
  const presetConfig = ENCODING_PRESETS[preset]

  return {
    format,
    codec,
    resolution,
    fps,
    videoBitrate: null,
    crf: presetConfig.crf,
    preset: useGpu && gpuCodec
      ? (gpuCodec.includes("nvenc")
        ? GPU_ENCODING_PRESETS[preset].preset
        : QSV_ENCODING_PRESETS[preset].preset)
      : presetConfig.preset,
    tune: presetConfig.tune,
    audioCodec: presetConfig.audioCodec,
    audioBitrate: presetConfig.audioBitrate,
    container: CONTAINER_MAP[format],
    pixelFormat: presetConfig.pixelFormat,
  }
}

export function getCodecArgs(target: OutputTarget): string[] {
  if (target.codec === "h264" || target.codec.includes("264")) {
    return FAST_CODEC_ARGS.h264
  }
  if (target.codec === "vp9") {
    return FAST_CODEC_ARGS.vp9
  }
  if (target.codec === "av1") {
    return FAST_CODEC_ARGS.av1
  }
  return []
}

export function getOutputMimeType(format: ExportOutputFormat): string {
  return MIME_MAP[format]
}

export function getFileExtension(format: ExportOutputFormat): string {
  return format
}