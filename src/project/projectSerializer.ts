import type { Project, SavedProject } from "./projectTypes"

export function saveProject(project: Project): SavedProject {
  const now = Date.now()
  return {
    project,
    version: 1,
    createdAt: now,
    updatedAt: now,
  }
}

export function exportProjectJSON(project: Project): void {
  const saved = saveProject(project)
  const blob = new Blob([JSON.stringify(saved, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${project.name}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function loadProject(json: string): Project {
  let saved: SavedProject
  try {
    saved = JSON.parse(json) as SavedProject
  } catch {
    throw new Error("Invalid project file: could not parse JSON.")
  }

  if (!saved.project) throw new Error("Invalid project file: missing 'project' field.")
  if (!saved.project.id) throw new Error("Invalid project file: missing 'project.id'.")
  if (!Array.isArray(saved.project.tracks)) throw new Error("Invalid project file: 'project.tracks' must be an array.")
  if (!Array.isArray(saved.project.media)) throw new Error("Invalid project file: 'project.media' must be an array.")

  return saved.project
}
