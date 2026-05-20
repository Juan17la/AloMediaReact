import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"
import { safeMediaFileName } from "./ffmpegUtils"

const ffmpegProxy = new FFmpeg()

async function loadProxyFFmpeg(): Promise<void> {
  if (ffmpegProxy.loaded) return
  console.log("[proxyEngine] Loading single-threaded core...")
  const baseURL = new URL("/ffmpeg-core-st/", location.href).href
  await ffmpegProxy.load({
    coreURL: await toBlobURL(`${baseURL}ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}ffmpeg-core.wasm`, "application/wasm"),
  })
  console.log("[proxyEngine] Single-threaded core loaded.")
}

// Serialize proxy jobs so concurrent uploads don't collide on the FFmpeg instance
let proxyQueue: Promise<void> = Promise.resolve()

export function generateProxy(
  mediaId: string,
  file: File,
  onReady: (objectUrl: string) => void,
  onError: () => void
): void {
  proxyQueue = proxyQueue.then(() => runProxy(mediaId, file, onReady, onError))
}

async function runProxy(
  mediaId: string,
  file: File,
  onReady: (objectUrl: string) => void,
  onError: () => void
): Promise<void> {
  const inputName = safeMediaFileName(mediaId, file)
  const outputName = `proxy_${mediaId}.mp4`
  try {
    await loadProxyFFmpeg()
    await ffmpegProxy.writeFile(inputName, await fetchFile(file))
    await ffmpegProxy.exec([
      "-i", inputName,
      "-vf", "scale=640:360",
      "-crf", "28",
      "-preset", "fast",
      "-an",
      outputName,
    ])
    const raw = await ffmpegProxy.readFile(outputName) as Uint8Array
    const copy = new Uint8Array(raw.length)
    copy.set(raw)
    const blob = new Blob([copy], { type: "video/mp4" })
    onReady(URL.createObjectURL(blob))
  } catch {
    onError()
  } finally {
    await ffmpegProxy.deleteFile(inputName).catch(() => { })
    await ffmpegProxy.deleteFile(outputName).catch(() => { })
  }
}
