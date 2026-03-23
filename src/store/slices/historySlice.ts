import type { StateCreator } from "zustand"
import { pausePlayer } from "../../hooks/usePlayer"
import type { HistoryEntry } from "../../project/projectTypes"
import type { EditorStore } from "../editorStore"

export interface HistorySlice {
  history: HistoryEntry[]
  historyIndex: number
  /**
   * Deep-clones the current project snapshot onto the undo stack, discarding any
   * forward history. Also pauses the player as a side-effect and returns whether
   * playback was active so callers can resume it after the mutation.
   */
  pushHistory: (description: string) => boolean
  undo: () => void
  redo: () => void
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

export const createHistorySlice: StateCreator<EditorStore, [], [], HistorySlice> = (set, get) => ({
  history: [],
  historyIndex: -1,

  pushHistory(description) {
    // Stop playback loop without releasing buffers or audio graph.
    const wasPlaying = pausePlayer()
    const state = get()
    const snapshot = deepClone(state.project)
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push({ project: snapshot, description })
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
    return wasPlaying
  },

  undo() {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    set({ project: deepClone(history[newIndex].project), historyIndex: newIndex })
  },

  redo() {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    set({ project: deepClone(history[newIndex].project), historyIndex: newIndex })
  },
})
