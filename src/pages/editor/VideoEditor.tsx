import { useRef, useState, useEffect, useCallback } from "react"
import type { CSSProperties } from "react"
import { useParams, useNavigate, useBlocker } from "react-router"
import { MediaLibrary } from "../../components/editor/MediaLibrary"
import { Timeline } from "../../components/editor/Timeline"
import { Toolbar } from "../../components/editor/Toolbar"
import { PreviewPlayer } from "../../components/editor/PreviewPlayer"
import { InspectorPanel } from "../../components/editor/InspectorPanel"
import { ExportModal } from "../../components/editor/ExportModal"
import { EditorToolbar } from "../../components/editor/EditorToolbar"
import { SaveProjectModal } from "../../components/editor/SaveProjectModal"
import { ShareProjectModal } from "../../components/editor/ShareProjectModal"
import { UnsavedChangesModal } from "../../components/editor/UnsavedChangesModal"
import { useEditorStore, fileMap } from "../../store/editorStore"
import { loadProject } from "../../project/projectSerializer"
import { useExport } from "../../hooks/useExport"
import { useEditorKeyboardShortcuts } from "../../hooks/useEditorKeyboardShortcuts"
import { getProjectById, createProject, updateProject } from "../../services/projectService"
import { serializeTimeline, deserializeTimeline } from "../../utils/timelineSerializer"
import type { ApiProject } from "../../types/projectApiTypes"
import type { Project } from "../../project/projectTypes"
import { ApiError } from "../../api/errors"
import { MediaRelinkDialog } from "../../components/editor/MediaRelinkDialog"
import { saveFileToCache, evictExpiredEntries } from "../../services/fileCacheService"
import { EditorErrorBoundary } from "../../components/editor/EditorErrorBoundary"

export default function VideoEditor() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const project = useEditorStore(s => s.project)
  const resetProject = useEditorStore(s => s.resetProject)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(project.name)
  const [showExportModal, setShowExportModal] = useState(false)
  const loadInputRef = useRef<HTMLInputElement>(null)

  // API project state
  const [apiProject, setApiProject] = useState<ApiProject | null>(null)
  const [isLoadingProject, setIsLoadingProject] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Dirty tracking — compare store reference against the last known saved project
  const [isDirty, setIsDirty] = useState(false)
  const savedProjectRef = useRef<Project>(useEditorStore.getState().project)

  useEffect(() => {
    return useEditorStore.subscribe(state => {
      if (state.project !== savedProjectRef.current) {
        setIsDirty(true)
      }
    })
  }, [])

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(id)
  }, [toast])

  // Load project from API when projectId is present
  useEffect(() => {
    if (!projectId) return
    const numericId = parseInt(projectId, 10)
    if (isNaN(numericId)) return

    setIsLoadingProject(true)
    setLoadError(null)

    getProjectById(numericId)
      .then(async loaded => {
        const editorProject = deserializeTimeline(loaded.timelineData)
        savedProjectRef.current = editorProject
        setIsDirty(false)
        await useEditorStore.getState().loadProject(editorProject)
        setTitleDraft(editorProject.name)
        setApiProject(loaded)
      })
      .catch(err => {
        setLoadError(err instanceof ApiError ? err.message : 'Failed to load project.')
      })
      .finally(() => setIsLoadingProject(false))
  }, [projectId])

  const missingMediaIds = useEditorStore(s => s.missingMediaIds)

  // Evict stale IDB cache entries once on mount
  useEffect(() => {
    evictExpiredEntries().catch(() => {})
  }, [])

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
  const showInspector =
    selectedClip?.type === "video" || selectedClip?.type === "image" || selectedClip?.type === "audio"

  function handleLoadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const loaded = loadProject(ev.target?.result as string)
        savedProjectRef.current = loaded
        setIsDirty(false)
        await useEditorStore.getState().loadProject(loaded)
        setTitleDraft(loaded.name)
      } catch (err) {
        alert(String(err))
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  function commitTitle() {
    const newName = titleDraft.trim() || "Untitled Project"
    useEditorStore.setState(s => ({
      project: { ...s.project, name: newName },
    }))
    setIsEditingTitle(false)
  }

  const handleSave = useCallback(() => {
    if (!apiProject) {
      setShowSaveModal(true)
      return
    }
    const currentProject = useEditorStore.getState().project
    setIsSaving(true)
    updateProject(apiProject.id, {
      name: currentProject.name,
      timelineData: serializeTimeline(currentProject),
    })
      .then(updated => {
        setApiProject(updated)
        savedProjectRef.current = currentProject
        setIsDirty(false)
        setToast({ message: 'Project saved.', type: 'success' })
        // Background: persist files to IDB cache so they survive reload
        currentProject.media.forEach(m => {
          const file = fileMap.get(m.id)
          if (file) saveFileToCache(m.hash, file).catch(() => {})
        })
      })
      .catch(err => {
        const msg = err instanceof ApiError ? err.message : 'Failed to save project.'
        setToast({ message: msg, type: 'error' })
      })
      .finally(() => setIsSaving(false))
  }, [apiProject])

  const handleSaveConfirm = useCallback(async (name: string) => {
    const currentProject = useEditorStore.getState().project
    setIsSaving(true)
    try {
      const created = await createProject({
        name,
        timelineData: serializeTimeline(currentProject),
      })
      useEditorStore.setState(s => ({ project: { ...s.project, name } }))
      const updatedProject = useEditorStore.getState().project
      savedProjectRef.current = updatedProject
      setIsDirty(false)
      setApiProject(created)
      setShowSaveModal(false)
      setTitleDraft(name)
      navigate(`/editor/${created.id}`, { replace: true })
      setToast({ message: 'Project saved.', type: 'success' })
      // Background: persist files to IDB cache so they survive reload
      useEditorStore.getState().project.media.forEach(m => {
        const file = fileMap.get(m.id)
        if (file) saveFileToCache(m.hash, file).catch(() => {})
      })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save project.'
      setToast({ message: msg, type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }, [navigate])

  // Block in-app navigation when there are unsaved changes
  const blocker = useBlocker(isDirty)

  if (isLoadingProject) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark text-accent-white">
        <p className="text-sm text-muted">Loading project…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark text-accent-white flex-col gap-4">
        <p className="text-sm text-red-400">{loadError}</p>
        <button
          onClick={() => navigate('/dashboard')}
          style={ghostButtonStyle}
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden text-accent-white font-sans select-none cursor-default" style={{ background: "#000000", position: "relative", zIndex: 0 }}>

      {/* Atmospheric glow 1 — bottom-left */}
      <div style={{ position: "absolute", bottom: 0, left: 0, width: 700, height: 700, borderRadius: "50%", background: "rgba(180,20,20,0.15)", filter: "blur(160px)", pointerEvents: "none", zIndex: -1, display: "none" }} />
      {/* Atmospheric glow 2 — top-right */}
      <div style={{ position: "absolute", top: 0, right: 0, width: 500, height: 500, borderRadius: "50%", background: "rgba(100,0,0,0.10)", filter: "blur(200px)", pointerEvents: "none", zIndex: -1, display: "none" }} />

      {/* ── Topbar ── */}
      <header
        className="flex items-center shrink-0"
        style={{
          height: 50,
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(28px) saturate(160%)",
          WebkitBackdropFilter: "blur(28px) saturate(160%)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 12px rgba(0,0,0,0.40), 0 8px 24px rgba(0,0,0,0.25)",
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
          <a
            href="/"
            style={{
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.15em",
              color: "var(--color-accent-red)",
            }}
          >
            ALO
          </a>
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

        <EditorToolbar
          apiProject={apiProject}
          isSaving={isSaving}
          isExporting={isExporting}
          onLoad={() => loadInputRef.current?.click()}
          onSave={handleSave}
          onShare={() => setShowShareModal(true)}
          onExport={() => setShowExportModal(true)}
        />
      </header>

      {/* ── Middle row: Media panel + Preview + Inspector ── */}
      <EditorErrorBoundary onReset={resetProject}>
        <div className="flex flex-1 min-h-0 overflow-hidden gap-0">
          <aside
            className="shrink-0 flex flex-col overflow-hidden border-r border-white/10"
            style={{
              width: 280,
            }}
          >
            <MediaLibrary />
          </aside>

          <div
            className="flex flex-1 min-h-0 min-w-0 overflow-hidden"
            style={{minWidth: 480}}
          >
            <PreviewPlayer />
          </div>

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
      </EditorErrorBoundary>

      <input
        ref={loadInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleLoadFile}
      />

      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 50,
            padding: "12px 18px",
            background: "rgba(18, 20, 24, 0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.10)",
            borderLeft: toast.type === 'success'
              ? "3px solid rgba(60, 200, 100, 0.80)"
              : "3px solid var(--color-accent-red)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.88)",
          }}
        >
          {toast.message}
        </div>
      )}

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

      {showSaveModal && (
        <SaveProjectModal
          initialName={project.name}
          onConfirm={handleSaveConfirm}
          onCancel={() => setShowSaveModal(false)}
          isSaving={isSaving}
        />
      )}

      {showShareModal && apiProject && (
        <ShareProjectModal
          projectId={apiProject.id}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {blocker.state === 'blocked' && (
        <UnsavedChangesModal
          onLeave={() => blocker.proceed?.()}
          onStay={() => blocker.reset?.()}
        />
      )}

      {missingMediaIds.size > 0 && (
        <MediaRelinkDialog
          onClose={() => useEditorStore.setState({ missingMediaIds: new Set() })}
        />
      )}
    </div>
  )
}

const ghostButtonStyle: CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  fontSize: 13,
  border: '1px solid rgba(255, 255, 255, 0.10)',
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: 'rgba(255, 255, 255, 0.80)',
  cursor: 'pointer',
  fontFamily: 'inherit',
}
