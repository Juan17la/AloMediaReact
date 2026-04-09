import type { StateCreator } from "zustand"
import { pausePlayer } from "../../hooks/usePlayer"
import type { EditorStore } from "../editorStore"
import {
  createEditHistory,
  recordState,
  undoHistory,
  redoHistory,
} from "../../utils/editHistory"
import type { EditHistoryState } from "../../utils/editHistory"

export interface HistorySlice {
  editHistory: EditHistoryState
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
  editHistory: createEditHistory(),

  pushHistory(description) {
    // Stop playback loop without releasing buffers or audio graph.
    const wasPlaying = pausePlayer()
    const state = get()
    // Record: pushes current present onto past stack, clears future stack.
    set({ editHistory: recordState(state.editHistory, state.project, description) })
    return wasPlaying
  },

  undo() {
    const result = undoHistory(get().editHistory)
    if (!result) return
    // Pop from past stack → present; old present pushed onto future stack.
    set({ editHistory: result, project: deepClone(result.present!.project) })
  },

  redo() {
    const result = redoHistory(get().editHistory)
    if (!result) return
    // Pop from future stack → present; old present pushed onto past stack.
    set({ editHistory: result, project: deepClone(result.present!.project) })
  },
})
