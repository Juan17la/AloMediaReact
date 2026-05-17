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
