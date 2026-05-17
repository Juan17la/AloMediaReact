import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"

const ffmpeg = new FFmpeg()

export function getFFmpeg(): FFmpeg {
  return ffmpeg
}

export async function loadFFmpeg(): Promise<void> {
  if (ffmpeg.loaded) return
  console.log("[ffmpegEngine] Loading single-threaded core...")
  const baseURL = new URL("/ffmpeg-core-st/", location.href).href
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}ffmpeg-core.wasm`, "application/wasm"),
  })
  console.log("[ffmpegEngine] Single-threaded core loaded.")
}

export async function execFFmpeg(args: string[]): Promise<void> {
  const code = await ffmpeg.exec(args)
  if (code !== 0) {
    throw new Error(`FFmpeg exited with code ${code}`)
  }
}
