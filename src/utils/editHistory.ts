import type { HistoryEntry, Project } from "../project/projectTypes"

/**
 * Two-stack undo/redo state.
 *
 * This is a classic Stack data structure applied as two separate stacks:
 *   - `past`    — entries that were recorded before the current state (LIFO).
 *   - `future`  — entries that were undone and can be redone (LIFO).
 *   - `present` — the most recent snapshot, sitting between the two stacks.
 *
 * How it works:
 *   record()  → pushes the current `present` onto `past`, sets the new snapshot
 *               as `present`, and clears `future` (new action invalidates redo).
 *   undo()    → pops from `past` into `present`, pushes old `present` onto `future`.
 *   redo()    → pops from `future` into `present`, pushes old `present` onto `past`.
 *
 * This eliminates the cursor-index arithmetic of a single-array approach.
 * "Can undo?" is simply `past.length > 0`, "can redo?" is `future.length > 0`.
 */
export interface EditHistoryState {
  past: HistoryEntry[]
  present: HistoryEntry | null
  future: HistoryEntry[]
}

/** Returns an empty history — no past, no present, no future. */
export function createEditHistory(): EditHistoryState {
  return { past: [], present: null, future: [] }
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

/**
 * Records a new project snapshot onto the history.
 *
 * Stack mechanics:
 *   1. The current `present` is pushed onto the `past` stack (saved for undo).
 *   2. The new snapshot becomes the `present`.
 *   3. `future` is emptied — once a new action is taken, the redo path is gone.
 *      This is the standard undo/redo contract: branching history is not kept.
 */
export function recordState(
  state: EditHistoryState,
  project: Project,
  description: string,
): EditHistoryState {
  const entry: HistoryEntry = { project: deepClone(project), description }
  return {
    past: state.present ? [...state.past, state.present] : state.past,
    present: entry,
    future: [], // new action clears redo — explicit and obvious
  }
}

/**
 * Undo: pops the most recent entry from `past` into `present`.
 *
 * Stack mechanics:
 *   1. The current `present` is pushed onto `future` (saved for redo).
 *   2. The top of `past` is popped and becomes the new `present`.
 *
 * Returns null if there is nothing to undo (past is empty).
 */
export function undoHistory(state: EditHistoryState): EditHistoryState | null {
  if (state.past.length === 0 || !state.present) return null
  return {
    past: state.past.slice(0, -1),
    present: state.past[state.past.length - 1],
    future: [state.present, ...state.future],
  }
}

/**
 * Redo: pops the first entry from `future` into `present`.
 *
 * Stack mechanics:
 *   1. The current `present` is pushed onto `past` (saved for undo).
 *   2. The first element of `future` is popped and becomes the new `present`.
 *
 * Returns null if there is nothing to redo (future is empty).
 */
export function redoHistory(state: EditHistoryState): EditHistoryState | null {
  if (state.future.length === 0 || !state.present) return null
  return {
    past: [...state.past, state.present],
    present: state.future[0],
    future: state.future.slice(1),
  }
}
