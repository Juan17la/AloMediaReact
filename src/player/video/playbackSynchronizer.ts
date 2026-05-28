import type { VideoClip } from "../../project/projectTypes"
import { DEFAULT_SPEED } from "../../constants/speed"
import { DRIFT_CORRECTION_THRESHOLD_S } from "../../constants/timeline"

export class PlaybackSynchronizer {
  private clipPlayStartPh = new Map<string, number>()

  recordPlayStart(clipId: string, ph: number): void {
    this.clipPlayStartPh.set(clipId, ph)
  }

  getClipStartPh(clipId: string): number | undefined {
    return this.clipPlayStartPh.get(clipId)
  }

  deleteClipStartPh(clipId: string): void {
    this.clipPlayStartPh.delete(clipId)
  }

  calculateMediaTime(clip: VideoClip, ph: number): number {
    const clipSpeed = clip.speed ?? DEFAULT_SPEED
    const clipStartPh = this.clipPlayStartPh.get(clip.id) ?? clip.timelineStart
    return clip.mediaStart + (ph - clipStartPh) * clipSpeed
  }

  needsSeek(clip: VideoClip, ph: number, currentTime: number): boolean {
    const clipSpeed = clip.speed ?? DEFAULT_SPEED
    const clipStartPh = this.clipPlayStartPh.get(clip.id) ?? clip.timelineStart
    const expected = Math.max(
      clip.mediaStart,
      clip.mediaStart + (ph - clipStartPh) * clipSpeed,
    )
    return Math.abs(currentTime - expected) > DRIFT_CORRECTION_THRESHOLD_S
  }

  getSeekTarget(clip: VideoClip, ph: number): number {
    const clipSpeed = clip.speed ?? DEFAULT_SPEED
    const clipStartPh = this.clipPlayStartPh.get(clip.id) ?? clip.timelineStart
    const mediaTime = clip.mediaStart + (ph - clipStartPh) * clipSpeed
    return Math.max(clip.mediaStart, mediaTime)
  }

  clear(): void {
    this.clipPlayStartPh.clear()
  }
}