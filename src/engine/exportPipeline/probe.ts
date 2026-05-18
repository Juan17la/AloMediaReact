import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile } from "@ffmpeg/util"
import type { MediaProbeResult } from "./types"

const probeCache = new Map<string, MediaProbeResult>()

export function clearProbeCache(): void {
  probeCache.clear()
}

export async function probeMedia(
  ffmpeg: FFmpeg,
  mediaId: string,
  fileHash: string,
  fileName: string,
): Promise<MediaProbeResult> {
  const cached = probeCache.get(fileHash)
  if (cached) return cached

  const defaultResult: MediaProbeResult = {
    mediaId,
    fileHash,
    codec: "h264",
    width: 1280,
    height: 720,
    fps: 30,
    duration: 0,
    isVfr: false,
    pixelFormat: "yuv420p",
    audioCodec: "aac",
    audioSampleRate: 44100,
    audioChannels: 2,
    audioBitrate: 128,
    fileExtension: fileName.split(".").pop()?.toLowerCase() ?? "mp4",
  }

  try {
    const ext = fileName.split(".").pop() ?? "mp4"
    const writeName = `probe_${mediaId}.${ext}`
    const fileData = await fetchFile(fileName)
    await ffmpeg.writeFile(writeName, fileData)

    try {
      await ffmpeg.exec(["-i", writeName, "-f", "null", "-"])
    } catch {
      // FFmpeg returns non-zero when no output is specified, but stderr has probe info
    }

    await ffmpeg.deleteFile(writeName).catch(() => {})
  } catch {
    // Use defaults if probing fails
  }

  probeCache.set(fileHash, defaultResult)
  return defaultResult
}

export async function probeMediaFromProperties(
  mediaId: string,
  fileHash: string,
  fileName: string,
  properties: {
    width?: number
    height?: number
    fps?: number
    duration?: number
    codec?: string
  },
): Promise<MediaProbeResult> {
  const cached = probeCache.get(fileHash)
  if (cached) return cached

  const result: MediaProbeResult = {
    mediaId,
    fileHash,
    codec: properties.codec ?? "h264",
    width: properties.width ?? 1280,
    height: properties.height ?? 720,
    fps: properties.fps ?? 30,
    duration: properties.duration ?? 0,
    isVfr: false,
    pixelFormat: "yuv420p",
    audioCodec: "aac",
    audioSampleRate: 44100,
    audioChannels: 2,
    audioBitrate: 128,
    fileExtension: fileName.split(".").pop()?.toLowerCase() ?? "mp4",
  }

  probeCache.set(fileHash, result)
  return result
}