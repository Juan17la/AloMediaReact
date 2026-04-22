import { generateId } from "../../utils/id"
import type { Project } from "../../project/projectTypes"

// Module-level file registry. Not part of reactive Zustand state - Map mutations
// don't trigger re-renders, but PreviewPlayer reads it after project.media updates.
export const fileMap = new Map<string, File>()

export function makeInitialProject(): Project {
  return {
    id: generateId(),
    name: "Untitled Project",
    media: [],
    clipGroups: [],
    tracks: [
      { id: generateId(), type: "video", order: 0, clips: [] },
      { id: generateId(), type: "audio", order: 1, clips: [] },
    ],
  }
}