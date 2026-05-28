import type { VideoClip } from "../../project/projectTypes"
import { DEFAULT_SPEED } from "../../constants/speed"

export interface SwapMetadata {
  clipId: string
  mediaId: string
  src: string
  speed: number
  mediaStart: number
  timelineStart: number
}

type UrlResolver = (mediaId: string) => string | undefined

export class BufferSwapManager {
  private swapGen = 0
  private swapPending = false

  initiateSwap(_nextClip: VideoClip, _metadata: SwapMetadata): number {
    this.swapPending = true
    return ++this.swapGen
  }

  confirmSwap(): void {
    this.swapPending = false
  }

  cancelSwap(): void {
    this.swapPending = false
  }

  isSwapPending(): boolean {
    return this.swapPending
  }

  getCurrentGen(): number {
    return this.swapGen
  }

  createSwapMetadata(clip: VideoClip, getUrl: UrlResolver): SwapMetadata {
    return {
      clipId: clip.id,
      mediaId: clip.mediaId,
      src: getUrl(clip.mediaId) ?? "",
      speed: clip.speed ?? DEFAULT_SPEED,
      mediaStart: clip.mediaStart,
      timelineStart: clip.timelineStart,
    }
  }
}