const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB

// Mirrors the backend MIME allow-list exactly (see 06-AI-Audio-Feature.md §4).
// Extension fallback handles browsers that report non-standard MIME types.
const ALLOWED_AUDIO_MIMES = new Set([
  "audio/wav",
  "audio/mpeg",   // mp3
  "audio/ogg",
  "audio/flac",
  "audio/x-m4a",
  "audio/mp4",    // m4a
])

const ALLOWED_AUDIO_EXTENSIONS = new Set(["wav", "mp3", "mpeg", "mpga", "ogg", "flac", "m4a"])

export type ValidationResult = { ok: true } | { ok: false; error: string }

export function validateAudioFile(file: File): ValidationResult {
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 50 MB.`,
    }
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!ALLOWED_AUDIO_MIMES.has(file.type) && !ALLOWED_AUDIO_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      error: "Unsupported format. Accepted: wav, mp3/mpeg, ogg, flac, m4a",
    }
  }

  return { ok: true }
}

export function getResultName(originalName: string, suffix: string, ext: string): string {
  const dotIdx = originalName.lastIndexOf(".")
  const base = dotIdx > 0 ? originalName.slice(0, dotIdx) : originalName
  return `${base}_${suffix}.${ext}`
}
