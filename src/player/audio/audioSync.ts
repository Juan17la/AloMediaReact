import { MediaBuffer } from "./mediaBuffer"

export { computeEqualPowerGains, computeTransitionProgress } from "./mediaBuffer"

const mediaBufferInstance = new MediaBuffer()

export const syncAudioElements = mediaBufferInstance.syncAudioElements.bind(mediaBufferInstance)

export function destroyAudioContext(trackId: string): void {
  mediaBufferInstance.destroyAudioContext(trackId)
}

export function disconnectAll(): void {
  mediaBufferInstance.disconnectAll()
}

export const audioBuffer = mediaBufferInstance