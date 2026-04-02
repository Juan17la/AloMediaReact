import type { Project, SavedProject } from "./projectTypes"
import { ensureCanonicalTransitionEdges } from "./transitionEdges"

const PROJECT_SCHEMA_VERSION = 2

export function saveProject(project: Project): SavedProject {
  const now = Date.now()
  const canonicalized = ensureCanonicalTransitionEdges(project)
  return {
    project: canonicalized.project,
    version: PROJECT_SCHEMA_VERSION,
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

  const canonicalized = ensureCanonicalTransitionEdges(saved.project)
  if (canonicalized.report.warnings.length > 0) {
    for (const warning of canonicalized.report.warnings) {
      console.warn(warning)
    }
  }
  if ((saved.version ?? 0) < PROJECT_SCHEMA_VERSION) {
    console.info(
      `[projectSerializer] Migrated project ${saved.project.id} to schema v${PROJECT_SCHEMA_VERSION} with ${canonicalized.report.generatedEdges} transition edge(s).`,
    )
  }

  return canonicalized.project
}
