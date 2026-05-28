import type { MediaBuffer } from "./mediaBuffer"

/** Incrementally syncs audio elements with the current set of audio track IDs. */
export function syncAudioPool(
  pool: Map<string, HTMLAudioElement>,
  audioTrackIds: string[],
  mediaBuffer?: MediaBuffer,
): void {
  const needed = new Set(audioTrackIds)

  for (const [trackId, el] of pool) {
    if (!needed.has(trackId)) {
      el.pause()
      if (el.parentNode) el.parentNode.removeChild(el)
      mediaBuffer?.destroyAudioContext(trackId)
      pool.delete(trackId)
    }
  }

  for (const trackId of audioTrackIds) {
    if (pool.has(trackId)) continue
    const el = document.createElement("audio")
    el.preload = "auto"
    el.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none"
    document.body.appendChild(el)
    pool.set(trackId, el)
  }
}

/** Destroys all audio elements in the pool (call on unmount). */
export function destroyAudioPool(pool: Map<string, HTMLAudioElement>, mediaBuffer?: MediaBuffer): void {
  for (const [trackId, el] of pool) {
    el.pause()
    if (el.parentNode) el.parentNode.removeChild(el)
    mediaBuffer?.destroyAudioContext(trackId)
  }
  pool.clear()
}