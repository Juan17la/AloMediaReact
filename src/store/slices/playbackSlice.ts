import type { StateCreator } from "zustand"
import { toMs, toSeconds } from "../../utils/time"
import type { EditorStore } from "../editorStore"

export interface PlaybackSlice {
  playhead: number
  isPlaying: boolean
  setPlayhead: (time: number) => void
  setIsPlaying: (value: boolean) => void
}

export const createPlaybackSlice: StateCreator<EditorStore, [], [], PlaybackSlice> = (set) => ({
  playhead: 0,
  isPlaying: false,

  setPlayhead(time) {
    // Round to nearest millisecond to eliminate sub-ms float drift.
    set({ playhead: toSeconds(toMs(time)) })
  },

  setIsPlaying(value) {
    set({ isPlaying: value })
  },
})
