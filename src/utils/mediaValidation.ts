import type { MediaType } from "../project/projectTypes"

// ── Allowed extensions (must be explicit — no wildcards) ──

const ALLOWED_VIDEO = new Set([
  "mp4", "mov", "webm", "avi", "mkv", "m4v", "flv", "wmv",
])

const ALLOWED_AUDIO = new Set([
  "wav", "mp3", "ogg", "flac", "m4a", "aac", "opus", "mpeg", "mpga",
  "wma", "aiff", "au",
])

const ALLOWED_IMAGE = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff", "svg",
])

const ALLOWED_SUBTITLE = new Set(["srt"])

// ── MIME-type prefixes (secondary check) ──

const VIDEO_MIME_PREFIXES = ["video/"]
const AUDIO_MIME_PREFIXES = ["audio/"]
const IMAGE_MIME_PREFIXES = ["image/"]

// ── Helpers ──

function getExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? ""
}

function isMimeTypeAllowed(mime: string): boolean {
  const lower = mime.toLowerCase()
  return (
    VIDEO_MIME_PREFIXES.some(p => lower.startsWith(p)) ||
    AUDIO_MIME_PREFIXES.some(p => lower.startsWith(p)) ||
    IMAGE_MIME_PREFIXES.some(p => lower.startsWith(p))
  )
}

// ── Public API ──

export interface ValidationResult {
  valid: boolean
  type: MediaType | null
  reason?: string
}

/**
 * Validates a file against the strict allow-list of FFmpeg-compatible formats.
 * Returns an object with `valid`, `type` (if valid), and an optional human-readable `reason`.
 */
export function validateMediaFile(file: File): ValidationResult {
  const ext = getExtension(file.name)
  const mime = file.type.toLowerCase()

  // 1. Explicit extension check (most reliable)
  if (ALLOWED_SUBTITLE.has(ext)) {
    return { valid: true, type: "subtitles" }
  }
  if (ALLOWED_VIDEO.has(ext)) {
    return { valid: true, type: "video" }
  }
  if (ALLOWED_AUDIO.has(ext)) {
    return { valid: true, type: "audio" }
  }
  if (ALLOWED_IMAGE.has(ext)) {
    return { valid: true, type: "image" }
  }

  // 2. MIME-type fallback for files that may lack an extension
  if (isMimeTypeAllowed(mime)) {
    if (mime.startsWith("video/")) return { valid: true, type: "video" }
    if (mime.startsWith("audio/")) return { valid: true, type: "audio" }
    if (mime.startsWith("image/")) return { valid: true, type: "image" }
  }

  // 3. Rejected — build a helpful reason
  const name = file.name || "Unknown file"
  const extLabel = ext ? `.${ext}` : "no extension"

  // Categorise the rejection for a better message
  const isArchive = ["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)
  const isDocument = ["txt", "doc", "docx", "pdf", "odt", "rtf"].includes(ext)
  const isSpreadsheet = ["xls", "xlsx", "csv", "ods"].includes(ext)
  const isExecutable = ["exe", "dll", "bat", "sh", "app", "dmg", "pkg", "deb", "rpm"].includes(ext)

  let reason: string
  if (isArchive) {
    reason = `"${name}" is an archive (${extLabel}). Archives are not supported. Please extract the media files first.`
  } else if (isDocument) {
    reason = `"${name}" is a document (${extLabel}). Only media files (video, audio, images) and .srt subtitles are allowed.`
  } else if (isSpreadsheet) {
    reason = `"${name}" is a spreadsheet (${extLabel}). Only media files (video, audio, images) and .srt subtitles are allowed.`
  } else if (isExecutable) {
    reason = `"${name}" is an executable (${extLabel}). Executables are not allowed for security reasons.`
  } else {
    reason = `"${name}" (${extLabel}) is not a supported format. Allowed: video, audio, images, and .srt subtitles.`
  }

  return { valid: false, type: null, reason }
}

/**
 * Returns a comma-separated accept string for HTML file inputs.
 */
export function getMediaInputAccept(): string {
  const exts = [
    ...ALLOWED_VIDEO,
    ...ALLOWED_AUDIO,
    ...ALLOWED_IMAGE,
    ...ALLOWED_SUBTITLE,
  ]
  return [
    "video/*",
    "audio/*",
    "image/*",
    ".srt",
    ...exts.map(e => `.${e}`),
  ].join(",")
}
