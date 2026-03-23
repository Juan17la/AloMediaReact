export function isFfmpegTerminateError(err: unknown): boolean {
  if (err instanceof Error) {
    return err.message.includes('FFmpeg.terminate')
  }
  return String(err).includes('FFmpeg.terminate')
}
