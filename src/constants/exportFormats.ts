import type { ExportOutputFormat } from "../project/projectTypes"

export interface ExportFormatProfile {
  videoCodec: string
  videoArgs: string[]
  audioCodec: string
  mimeType: string
}

export const EXPORT_FORMAT_PROFILES: Record<ExportOutputFormat, ExportFormatProfile> = {
  mp4: {
    videoCodec: "libx264",
    videoArgs: ["-preset", "fast", "-crf", "23"],
    audioCodec: "aac",
    mimeType: "video/mp4",
  },
  webm: {
    videoCodec: "libvpx-vp9",
    videoArgs: ["-b:v", "0", "-crf", "30"],
    audioCodec: "libopus",
    mimeType: "video/webm",
  },
  mov: {
    videoCodec: "libx264",
    videoArgs: ["-preset", "fast", "-crf", "23"],
    audioCodec: "aac",
    mimeType: "video/quicktime",
  },
  mkv: {
    videoCodec: "libx264",
    videoArgs: ["-preset", "fast", "-crf", "23"],
    audioCodec: "aac",
    mimeType: "video/x-matroska",
  },
  avi: {
    videoCodec: "mpeg4",
    videoArgs: ["-q:v", "5"],
    audioCodec: "libmp3lame",
    mimeType: "video/x-msvideo",
  },
}