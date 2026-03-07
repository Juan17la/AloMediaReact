import { useRef, useState } from "react"
import { MediaLibrary } from "../../components/editor/MediaLibrary"
import { Timeline } from "../../components/editor/Timeline"
import { Toolbar } from "../../components/editor/Toolbar"
import { PreviewPlayer } from "../../components/editor/PreviewPlayer"
import { useEditorStore } from "../../store/editorStore"
import { exportProjectJSON, loadProject } from "../../project/projectSerializer"
import { buildRenderJob } from "../../engine/renderPipeline"
import { renderJob } from "../../engine/ffmpegEngine"
import { fileMap } from "../../store/editorStore"

export default function VideoEditor() {
  const project = useEditorStore(s => s.project)
  const setProject = useEditorStore(s => s.undo) // used only for shape ref; actual load below

  const [isRendering, setIsRendering] = useState(false)
  const loadInputRef = useRef<HTMLInputElement>(null)

  async function handleRender() {
    setIsRendering(true)
    try {
      const job = buildRenderJob(project, "mp4", { width: 1280, height: 720 }, 30)
      const output = await renderJob(job, fileMap)
      const blob = new Blob([output], { type: "video/mp4" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${project.name}.mp4`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsRendering(false)
    }
  }

  function handleLoadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const loaded = loadProject(ev.target?.result as string)
        // Replace the store project via undo trick — use direct store set instead
        useEditorStore.setState({ project: loaded })
      } catch (err) {
        alert(String(err))
      }
    }
    reader.readAsText(file)
    // Reset input so the same file can be loaded again
    e.target.value = ""
  }

  const btnStyle: React.CSSProperties = {
    padding: "4px 12px",
    cursor: "pointer",
    fontSize: 13,
    border: "1px solid #334155",
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    borderRadius: 4,
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", backgroundColor: "#020617" }}>
      {/* Toolbar row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Toolbar />
        <div style={{ display: "flex", gap: 8, padding: "8px 0", marginLeft: 8 }}>
          <button style={btnStyle} onClick={() => exportProjectJSON(project)}>
            Export JSON
          </button>
          <button style={btnStyle} onClick={() => loadInputRef.current?.click()}>
            Load JSON
          </button>
          <input
            ref={loadInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={handleLoadFile}
          />
          <button
            style={{ ...btnStyle, opacity: isRendering ? 0.5 : 1, cursor: isRendering ? "not-allowed" : "pointer" }}
            disabled={isRendering}
            onClick={handleRender}
          >
            {isRendering ? "Rendering..." : "Render MP4"}
          </button>
        </div>
      </div>

      {/* Main content: MediaLibrary | PreviewPlayer | Timeline */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <MediaLibrary />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          {/* Top section: preview player */}
          <div style={{ display: "flex", padding: 12, backgroundColor: "#0a0f1e", borderBottom: "1px solid #1e293b" }}>
            <PreviewPlayer />
          </div>
          {/* Bottom section: timeline */}
          <Timeline />
        </div>
      </div>
    </div>
  )
}
