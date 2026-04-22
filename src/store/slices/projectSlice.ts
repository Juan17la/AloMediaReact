import type { StateCreator } from "zustand"
import type { EditorStore } from "../editorStore"
import { createProjectMediaActions } from "./projectSlice.mediaActions"
import { createProjectTimelineActions } from "./projectSlice.timelineActions"
import { createProjectClipPropertyActions } from "./projectSlice.clipPropertyActions"
import { fileMap, makeInitialProject } from "./projectSlice.state"
import type { ProjectSlice } from "./projectSlice.types"

export { fileMap }
export type { ProjectSlice }

export const createProjectSlice: StateCreator<EditorStore, [], [], ProjectSlice> = (set, get, store) => ({
  project: makeInitialProject(),
  missingMediaIds: new Set<string>(),
  idbResolvedMediaIds: new Set<string>(),
  ...createProjectMediaActions(set, get, store),
  ...createProjectTimelineActions(set, get, store),
  ...createProjectClipPropertyActions(set, get, store),
})
