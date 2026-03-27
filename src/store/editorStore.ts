import { create } from "zustand"
import { createProjectSlice } from "./slices/projectSlice"
import { createPlaybackSlice } from "./slices/playbackSlice"
import { createUiSlice } from "./slices/uiSlice"
import { createHistorySlice } from "./slices/historySlice"
import { createProxySlice } from "./slices/proxySlice"
import type { ProjectSlice } from "./slices/projectSlice"
import type { PlaybackSlice } from "./slices/playbackSlice"
import type { UiSlice } from "./slices/uiSlice"
import type { HistorySlice } from "./slices/historySlice"
import type { ProxySlice } from "./slices/proxySlice"

// Re-exported for consumers that import directly from this module.
export type { ProxyState } from "./slices/proxySlice"
export { fileMap } from "./slices/projectSlice"

export type EditorStore = ProjectSlice & PlaybackSlice & UiSlice & HistorySlice & ProxySlice

export const useEditorStore = create<EditorStore>()((...a) => ({
  ...createProjectSlice(...a),
  ...createPlaybackSlice(...a),
  ...createUiSlice(...a),
  ...createHistorySlice(...a),
  ...createProxySlice(...a),
}))
