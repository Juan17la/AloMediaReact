import { useRef, useState } from "react"
import { FolderOpen, Save, Share2, Film } from "lucide-react"
import { MediaLibrary } from "../../components/editor/MediaLibrary"
import { Timeline } from "../../components/editor/Timeline"
import { Toolbar } from "../../components/editor/Toolbar"
import { PreviewPlayer } from "../../components/editor/PreviewPlayer"
import { InspectorPanel } from "../../components/editor/InspectorPanel"
import { ExportModal } from "../../components/editor/ExportModal"
import { useEditorStore } from "../../store/editorStore"
import { exportProjectJSON, loadProject } from "../../project/projectSerializer"
import { useExport } from "../../hooks/useExport"
import { useEditorKeyboardShortcuts } from "../../hooks/useEditorKeyboardShortcuts"

export default function VideoEditor() {
  const project = useEditorStore(s => s.project)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(project.name)
  const [showExportModal, setShowExportModal] = useState(false)
  const loadInputRef = useRef<HTMLInputElement>(null)

  const { startExport, cancelExport, resetExportState, progress, isExporting } = useExport()
  useEditorKeyboardShortcuts()

  const selectedClip = useEditorStore(s => {
    if (!s.selectedClipId) return null
    for (const t of s.project.tracks) {
      const c = t.clips.find(c => c.id === s.selectedClipId)
      if (c) return c
    }
    return null
  })
  const showInspector = selectedClip?.type === "video" || selectedClip?.type === "image" || selectedClip?.type === "audio"

  function handleLoadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const loaded = loadProject(ev.target?.result as string)
        useEditorStore.setState({ project: loaded })
      } catch (err) {
        alert(String(err))
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  function commitTitle() {
    useEditorStore.setState(s => ({
      project: { ...s.project, name: titleDraft.trim() || "Untitled Project" },
    }))
    setIsEditingTitle(false)
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-dark text-accent-white font-sans select-none cursor-default">

      {/* ── Topbar ── */}
      <header
        className="flex items-center shrink-0 gap-0"
        style={{
          height: 40,
          background: "var(--color-dark)",
          borderBottom: "1px solid var(--color-dark-border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center shrink-0"
          style={{
            padding: "0 12px",
            borderRight: "1px solid var(--color-dark-border)",
            height: "100%",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.15em",
              color: "var(--color-accent-red)",
            }}
          >
            ALO
          </span>
        </div>

        {/* Project title */}
        <div
          className="flex items-center"
          style={{ padding: "0 12px", height: "100%", borderRight: "1px solid var(--color-dark-border)" }}
        >
          {isEditingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur() }}
              style={{
                background: "transparent",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-accent-white)",
                border: "none",
                borderBottom: "1px solid var(--color-accent-red)",
                outline: "none",
                width: 192,
                cursor: "text",
                fontFamily: "inherit",
              }}
            />
          ) : (
            <button
              onDoubleClick={() => { setTitleDraft(project.name); setIsEditingTitle(true) }}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-accent-white)",
                cursor: "text",
                maxWidth: 192,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
              }}
              title="Double-click to rename"
            >
              {project.name}
            </button>
          )}
        </div>

        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex items-center" style={{ gap: 4, padding: "0 8px" }}>
          <button
            onClick={() => loadInputRef.current?.click()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              height: 28,
              padding: "0 10px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              borderRadius: 8,
              border: "1px solid var(--color-dark-border)",
              background: "var(--color-dark-elevated)",
              color: "var(--color-accent-white)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-dark-border)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-dark-elevated)" }}
          >
            <FolderOpen size={12} />
            Load
          </button>

          <button
            onClick={() => exportProjectJSON(project)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              height: 28,
              padding: "0 10px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              borderRadius: 8,
              border: "1px solid var(--color-dark-border)",
              background: "var(--color-dark-elevated)",
              color: "var(--color-accent-white)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-dark-border)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-dark-elevated)" }}
          >
            <Save size={12} />
            Save
          </button>

          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              height: 28,
              padding: "0 10px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              borderRadius: 8,
              border: "1px solid var(--color-dark-border)",
              background: "var(--color-dark-elevated)",
              color: "var(--color-accent-white)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-dark-border)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-dark-elevated)" }}
          >
            <Share2 size={12} />
            Share
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            disabled={isExporting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              height: 28,
              padding: "0 10px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              borderRadius: 8,
              border: "1px solid var(--color-blood-red-light)",
              background: "var(--color-accent-red)",
              color: "#ffffff",
              cursor: isExporting ? "not-allowed" : "pointer",
              opacity: isExporting ? 0.6 : 1,
              fontFamily: "inherit",
            }}
            onMouseEnter={e => { if (!isExporting) (e.currentTarget as HTMLButtonElement).style.background = "var(--color-blood-red-light)" }}
            onMouseLeave={e => { if (!isExporting) (e.currentTarget as HTMLButtonElement).style.background = "var(--color-accent-red)" }}
          >
            <Film size={12} />
            Export
          </button>
        </div>
      </header>

      {/* ── Middle row: Media panel + Preview + Inspector ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ gap: 0 }}>
        {/* Media Library — fixed 240px */}
        <aside
          className="shrink-0 flex flex-col overflow-hidden"
          style={{
            width: 240,
            background: "var(--color-dark-surface)",
            borderRight: "1px solid var(--color-dark-border)",
          }}
        >
          <MediaLibrary />
        </aside>

        {/* Preview Player — flex 1 */}
        <div
          className="flex flex-1 min-h-0 min-w-0 overflow-hidden"
          style={{ background: "var(--color-dark)", minWidth: 480 }}
        >
          <PreviewPlayer />
        </div>

        {/* Inspector Panel — fixed 280px, hidden when no clip */}
        {showInspector && selectedClip ? (
          <InspectorPanel clip={selectedClip} />
        ) : null}
      </div>

      {/* ── Toolbar ── */}
      <Toolbar />

      {/* ── Timeline ── */}
      <div className="flex flex-col shrink-0 overflow-hidden" style={{ height: 260 }}>
        <Timeline />
      </div>

      <input
        ref={loadInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleLoadFile}
      />

      {showExportModal && (
        <ExportModal
          isExporting={isExporting}
          progress={progress}
          onStart={(options) => {
            startExport(options)
          }}
          onCancel={() => {
            cancelExport()
            resetExportState()
            setShowExportModal(false)
          }}
          onClose={() => {
            if (!isExporting) {
              resetExportState()
              setShowExportModal(false)
            }
          }}
          defaultFileName={`${project.name}_export`}
        />
      )}
    </div>
  )
}
