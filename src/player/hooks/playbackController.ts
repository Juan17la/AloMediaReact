import { useEditorStore } from "../../store/editorStore"
import { getProjectDuration } from "../../utils/time"
import { STORE_SYNC_INTERVAL_MS } from "../../constants/timeline"
import { createRafLoop } from "../core/rafLoop"
import { teardownPlayerState } from "../core/playerReset"
import type { RafLoopHandle } from "../core/rafLoop"

const playheadRef = { current: 0 }
const isPlayingRef = { current: false }
const onFrameRef = { current: null as ((playhead: number) => void) | null }
const needsReinitRef = { current: false }
const seekFlagResetRef = { current: null as (() => void) | null }

export { playheadRef, isPlayingRef }

/**
 * Manages playback state machine (play/pause/seek) and RAF loop.
 *
 * OOP Justification: This class encapsulates complex mutable state (RAF loop,
 * playhead position, playing flag) that cannot be reasonably modeled as pure
 * functions due to:
 *  - Timing-sensitive state transitions that must be coherent
 *  - RAF lifecycle management (start/stop/restart)
 *  - Coordination with media sync through shared refs
 *
 * Note: Shared refs (playheadRef, isPlayingRef) are module-level because they
 * are read from RAF callbacks without React re-renders - a deliberate
 * performance optimization.
 */
export class PlaybackController {
  private loop: RafLoopHandle

  constructor() {
    this.loop = createRafLoop({
      syncInterval: STORE_SYNC_INTERVAL_MS,
      getDuration: () =>
        getProjectDuration(useEditorStore.getState().project.tracks),
      onFrame: (ph) => {
        playheadRef.current = ph
        onFrameRef.current?.(ph)
      },
      onEnd: (duration) => {
        playheadRef.current = duration
        isPlayingRef.current = false
        useEditorStore.getState().setPlayhead(duration)
        useEditorStore.getState().setIsPlaying(false)
      },
      onStoreSync: (ph) => {
        useEditorStore.getState().setPlayhead(ph)
      },
    })
  }

  play(): void {
    if (isPlayingRef.current) return
    const initialPlayhead = Math.max(0, useEditorStore.getState().playhead)
    playheadRef.current = initialPlayhead
    if (needsReinitRef.current) {
      onFrameRef.current?.(initialPlayhead)
      needsReinitRef.current = false
    }
    isPlayingRef.current = true
    useEditorStore.getState().setIsPlaying(true)
    this.loop.start(initialPlayhead)
  }

  pause(): void {
    if (!isPlayingRef.current) return
    isPlayingRef.current = false
    this.loop.stop()

    useEditorStore.getState().setPlayhead(playheadRef.current)
    useEditorStore.getState().setIsPlaying(false)
  }

  seek(time: number): void {
    playheadRef.current = time
    useEditorStore.getState().setPlayhead(time)
    seekFlagResetRef.current?.()
    if (isPlayingRef.current) {
      this.loop.stop()
      this.loop.start(time)
    }
  }

  renderSingleFrame(): void {
    if (isPlayingRef.current) return
    if (!onFrameRef.current) return
    onFrameRef.current(playheadRef.current)
  }

  resetPlayerState(): void {
    teardownPlayerState({
      pause: () => this.pause(),
      isPlayingRef,
      needsReinitRef,
      playheadRef,
      onFrameRef,
    })
  }

  getPlayhead(): number {
    return playheadRef.current
  }

  getIsPlaying(): boolean {
    return isPlayingRef.current
  }

  setOnFrame(cb: (ph: number) => void): void {
    onFrameRef.current = cb
  }

  setSeekFlagReset(cb: () => void): void {
    seekFlagResetRef.current = cb
  }
}

export const playbackController = new PlaybackController()

export function resetPlayer(): void {
  playbackController.resetPlayerState()
}

export function pausePlayer(): boolean {
  const wasPlaying = isPlayingRef.current
  playbackController.pause()
  return wasPlaying
}

export function resumePlayer(): void {
  playbackController.play()
}

export function renderSingleFrame(): void {
  playbackController.renderSingleFrame()
}

export function usePlayer() {
  const isPlaying = useEditorStore((s) => s.isPlaying)

  return {
    play: () => playbackController.play(),
    pause: () => playbackController.pause(),
    seek: (time: number) => playbackController.seek(time),
    isPlaying,
    onFrameRef,
    playheadRef,
    seekFlagResetRef,
    resetPlayer: () => playbackController.resetPlayerState(),
  }
}