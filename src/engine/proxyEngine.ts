import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"
import { safeMediaFileName } from "./ffmpegUtils"

export class ProxyEngine {
  private ffmpeg: FFmpeg | null = null
  private queue: Promise<void> = Promise.resolve()
  private loading: Promise<void> | null = null

  async load(): Promise<void> {
    if (this.loading) return this.loading
    if (this.ffmpeg?.loaded) return

    this.loading = this.doLoad()
    await this.loading
    this.loading = null
  }

  private async doLoad(): Promise<void> {
    console.log("[proxyEngine] Loading single-threaded core...")
    this.ffmpeg = new FFmpeg()
    const baseURL = new URL("/ffmpeg-core-st/", location.href).href
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}ffmpeg-core.wasm`, "application/wasm"),
    })
    console.log("[proxyEngine] Single-threaded core loaded.")
  }

  async generateProxy(
    mediaId: string,
    file: File,
    onReady: (objectUrl: string) => void,
    onError: () => void,
  ): Promise<void> {
    this.queue = this.queue.then(() => this.runProxy(mediaId, file, onReady, onError))
  }

  private async runProxy(
    mediaId: string,
    file: File,
    onReady: (objectUrl: string) => void,
    onError: () => void,
  ): Promise<void> {
    if (!this.ffmpeg) {
      onError()
      return
    }

    const inputName = safeMediaFileName(mediaId, file)
    const outputName = `proxy_${mediaId}.mp4`
    try {
      await this.load()
      if (!this.ffmpeg) {
        onError()
        return
      }
      await this.ffmpeg.writeFile(inputName, await fetchFile(file))
      await this.ffmpeg.exec([
        "-i", inputName,
        "-vf", "scale=640:360",
        "-crf", "28",
        "-preset", "fast",
        "-an",
        outputName,
      ])
      const raw = await this.ffmpeg.readFile(outputName) as Uint8Array
      const copy = new Uint8Array(raw.length)
      copy.set(raw)
      const blob = new Blob([copy], { type: "video/mp4" })
      onReady(URL.createObjectURL(blob))
    } catch {
      onError()
    } finally {
      if (this.ffmpeg) {
        await this.ffmpeg.deleteFile(inputName).catch(() => { })
        await this.ffmpeg.deleteFile(outputName).catch(() => { })
      }
    }
  }

  dispose(): void {
    this.ffmpeg = null
    this.loading = null
  }
}

export const proxyEngine = new ProxyEngine()

export const generateProxy = (
  mediaId: string,
  file: File,
  onReady: (objectUrl: string) => void,
  onError: () => void,
) => proxyEngine.generateProxy(mediaId, file, onReady, onError)