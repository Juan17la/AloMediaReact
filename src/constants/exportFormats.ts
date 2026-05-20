import type { ExportOutputFormat } from "../project/projectTypes"
import type { EncodingPreset } from "../engine/exportPipeline"

export interface ExportFormatProfile {
  videoCodec: string
  videoArgs: string[]
  audioCodec: string
  mimeType: string
}

export const EXPORT_FORMAT_PROFILES: Record<ExportOutputFormat, ExportFormatProfile> = {
  mp4: {
    videoCodec: "libx264",
    videoArgs: ["-preset", "ultrafast", "-crf", "28", "-tune", "zerolatency"],
    audioCodec: "aac",
    mimeType: "video/mp4",
  },
  mov: {
    videoCodec: "libx264",
    videoArgs: ["-preset", "ultrafast", "-crf", "28", "-tune", "zerolatency"],
    audioCodec: "aac",
    mimeType: "video/quicktime",
  },
  mkv: {
    videoCodec: "libx264",
    videoArgs: ["-preset", "ultrafast", "-crf", "28", "-tune", "zerolatency"],
    audioCodec: "aac",
    mimeType: "video/x-matroska",
  },
  avi: {
    videoCodec: "libx264",
    videoArgs: ["-preset", "ultrafast", "-crf", "28", "-tune", "zerolatency"],
    audioCodec: "aac",
    mimeType: "video/x-msvideo",
  },
}

export function getFormatMimeType(format: ExportOutputFormat): string {
  return EXPORT_FORMAT_PROFILES[format].mimeType
}

export function getPresetForFormat(format: ExportOutputFormat, _preset: EncodingPreset): string[] {
  return EXPORT_FORMAT_PROFILES[format].videoArgs
}