import type { FFmpeg } from "@ffmpeg/ffmpeg"

export function isFfmpegTerminateError(err: unknown): boolean {
  if (err instanceof Error) {
    return err.message.includes('FFmpeg.terminate')
  }
  return String(err).includes('FFmpeg.terminate')
}

/**
 * Returns a safe, deterministic virtual-FS filename for a given media file.
 * Preserves the original extension so FFmpeg can detect the container format.
 * The result is a plain alphanumeric string with no slashes or blob URLs.
 */
export function safeMediaFileName(mediaId: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp4'
  return `media_${mediaId}.${ext}`
}

export function getLowercaseExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

export function isGifFileName(fileName: string): boolean {
  return getLowercaseExtension(fileName) === 'gif'
}

/**
 * Reads an output file from the FFmpeg virtual FS and returns its bytes.
 * Throws `ErrnoError` if the file does not exist (e.g. FFmpeg exited non-zero).
 */
export async function readOutputFile(ffmpeg: FFmpeg, filename: string): Promise<Uint8Array> {
  return (await ffmpeg.readFile(filename)) as Uint8Array
}

/**
 * Deletes files from the FFmpeg virtual FS. Errors are silently ignored so
 * a failed earlier run does not prevent cleanup on the next export attempt.
 */
export async function deleteFiles(ffmpeg: FFmpeg, names: Iterable<string>): Promise<void> {
  for (const name of names) {
    try {
      await ffmpeg.deleteFile(name)
    } catch {
      // File may not exist; ignore
    }
  }
}
