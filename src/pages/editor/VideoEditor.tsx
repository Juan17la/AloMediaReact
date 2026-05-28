import { useRef, useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useParams, useNavigate, useBlocker } from "react-router"
import { ArrowLeft } from "lucide-react"
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
import { loadProject, exportProjectJSON } from "../../project/projectSerializer"
import { useExport } from "../../hooks/useExport"
import { useEditorKeyboardShortcuts } from "../../hooks/useEditorKeyboardShortcuts"
import { getProjectById, createProject, updateProject } from "../../services/projectService"
import { deserializeTimeline } from "../../utils/timelineSerializer"
import type { ApiProject } from "../../types/projectApiTypes"
import type { Project } from "../../project/projectTypes"
import { ApiError } from "../../api/errors"
import { MediaRelinkDialog } from "../../components/editor/MediaRelinkDialog"
import { saveFileToCache, evictExpiredEntries } from "../../services/fileCacheService"
import { EditorErrorBoundary } from "../../components/editor/EditorErrorBoundary"
import AloMediaLogo from "../../assets/AloMediaLogo.webp"
import { normalizeProjectTimelineFromApi, serializeProjectTimelineForApi } from "../../project/timelineMediaAdapter"
import { hydrateProjectMediaCache } from "../../services/projectMediaSyncService"
import { useAuth } from "../../hooks/useAuth"

export default function VideoEditor() {
  const { t } = useTranslation("pages")
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

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
    if (!projectId || projectId === 'new') {
      resetProject()
      const freshProject = useEditorStore.getState().project
      savedProjectRef.current = freshProject
      setIsDirty(false)
      setApiProject(null)
      setLoadError(null)
      setIsLoadingProject(false)
      setTitleDraft(freshProject.name)
      return
    }

    const numericId = Number(projectId)
    if (!Number.isInteger(numericId) || numericId <= 0) {
      resetProject()
      const freshProject = useEditorStore.getState().project
      savedProjectRef.current = freshProject
      setIsDirty(false)
      setApiProject(null)
      setLoadError(null)
      setIsLoadingProject(false)
      setTitleDraft(freshProject.name)
      return
    }

    setIsLoadingProject(true)
    setLoadError(null)

    getProjectById(numericId)
      .then(async loaded => {
        const parsedProject = deserializeTimeline(loaded.timelineData)
        const normalizedProject = normalizeProjectTimelineFromApi(parsedProject, loaded.id)
        const hydratedProject = await hydrateProjectMediaCache(normalizedProject, loaded.id)
        await useEditorStore.getState().loadProject(hydratedProject)
        savedProjectRef.current = useEditorStore.getState().project
        setIsDirty(false)
        setTitleDraft(hydratedProject.name)
        setApiProject(loaded)
      })
      .catch(err => {
        setLoadError(err instanceof ApiError ? err.message : 'Failed to load project.')
      })
      .finally(() => setIsLoadingProject(false))
  }, [projectId, resetProject])

  const missingMediaIds = useEditorStore(s => s.missingMediaIds)

  // Evict stale IDB cache entries once on mount
  useEffect(() => {
    evictExpiredEntries().catch(() => { })
  }, [])

  // Browser-level guard for tab close/reload/external navigation.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const { startExport, cancelExport, resetExportState, progress, isExporting, engineInfo } = useExport()
  useEditorKeyboardShortcuts()

  const selectedClip = useEditorStore(s => {
    if (!s.selectedClipId) return null
    for (const t of s.project.tracks) {
      const c = t.clips.find(c => c.id === s.selectedClipId)
      if (c) return c
    }
    return null
  })
  const selectedTransitionClipId = useEditorStore(s => s.selectedTransitionClipId)
  const showInspector =
    !!selectedTransitionClipId ||
    selectedClip?.type === "video" ||
    selectedClip?.type === "image" ||
    selectedClip?.type === "audio" ||
    selectedClip?.type === "text"

  function handleLoadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const loaded = loadProject(ev.target?.result as string)
        await useEditorStore.getState().loadProject(loaded)
        savedProjectRef.current = useEditorStore.getState().project
        setIsDirty(false)
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

  const handleDownload = useCallback(() => {
    exportProjectJSON(project)
    setToast({ message: t("editor.downloadSuccess"), type: 'success' })
  }, [project, t])

  const handleSave = useCallback(async () => {
    if (!isAuthenticated) {
      setToast({ message: 'Please sign in to save your project.', type: 'error' })
      navigate('/auth/login')
      return
    }
    if (!apiProject) {
      setShowSaveModal(true)
      return
    }
    const currentProject = useEditorStore.getState().project
    setIsSaving(true)
    try {
      const timelineData = await serializeProjectTimelineForApi(currentProject, id => fileMap.get(id))
      const updated = await updateProject(apiProject.id, {
        name: currentProject.name,
        timelineData,
      })
      setApiProject(updated)
      savedProjectRef.current = currentProject
      setIsDirty(false)
      setToast({ message: 'Project saved.', type: 'success' })
      // Background: persist files to IDB cache so they survive reload
      currentProject.media.forEach(m => {
        const file = fileMap.get(m.id)
        if (file) saveFileToCache(m.hash, file).catch(() => { })
      })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save project.'
      setToast({ message: msg, type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }, [apiProject, isAuthenticated, navigate])

  const handleSaveConfirm = useCallback(async (name: string) => {
    if (!isAuthenticated) {
      setToast({ message: 'Please sign in to save your project.', type: 'error' })
      navigate('/auth/login')
      return
    }
    const currentProject = useEditorStore.getState().project
    setIsSaving(true)
    try {
      const timelineData = await serializeProjectTimelineForApi(currentProject, id => fileMap.get(id))
      const created = await createProject({
        name,
        timelineData,
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
        if (file) saveFileToCache(m.hash, file).catch(() => { })
      })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save project.'
      setToast({ message: msg, type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }, [navigate, isAuthenticated])

  // Block in-app navigation when there are unsaved changes
  const blocker = useBlocker(isDirty)

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  if (isMobile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-background text-accent-white px-6 text-center">
        <div className="text-6xl">📱</div>
        <h1 className="text-2xl font-bold text-on-surface">Mobile Not Supported</h1>
        <p className="max-w text-sm text-muted-foreground">
          The video editor is not available on mobile devices. Please use a desktop browser to access this feature.
        </p>
        <button
          onClick={() => navigate('/')}
          className="rounded-lg border border-outline-variant bg-surface-container px-6 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
        >
          Go to Home
        </button>
      </div>
    )
  }

  if (isLoadingProject) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-[3px] border-outline-variant border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading project…</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-accent-white">
        <p className="text-sm text-error">{loadError}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-lg border border-dark-border bg-dark-card px-4 py-2 text-[13px] text-accent-white/80 backdrop-blur-sm"
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="relative z-0 flex h-screen flex-col overflow-hidden bg-background font-sans text-accent-white select-none cursor-default">

      {/* Atmospheric glow 1 — bottom-left
      <div className="absolute bottom-1/2 left-2/5 w-175 h-175 rounded-full bg-[rgba(180,20,20,0.15)] blur-[160px] pointer-events-none" />
      {/* Atmospheric glow 2 — top-right */}
      {/* <div className="absolute top-1/2 right-2/7 w-175 h-175 rounded-full bg-[rgba(180,20,20,0.15)] blur-[160px] pointer-events-none" /> */}

      {/* ── Topbar ── */}
      <header
        className="flex items-center justify-between h-14 px-4 border-b border-outline-variant/60"
        style={{
          backdropFilter: "blur(28px) saturate(160%)",
          WebkitBackdropFilter: "blur(28px) saturate(160%)",
        }}
      >
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] text-muted-foreground hover:text-on-surface hover:bg-surface-container transition-colors duration-100 mr-1 shrink-0"
          title="Back to dashboard"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Logo */}
        <div className="flex h-full w-32 shrink-0 items-center border-r border-r-dark-border px-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="font-bold text-[13px] tracking-[0.15em] text-primary"
          >
            <img src={AloMediaLogo} alt="alomedialogo" className="w-full h-full"/>
          </button>
        </div>

        {/* Project title */}
        <div className="flex h-full items-center border-r border-r-dark-border px-3">
          {isEditingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur() }}
              className="w-48 cursor-text border-0 border-b border-b-error bg-transparent text-[13px] font-medium text-on-surface outline-none"
            />
          ) : (
            <button
              onDoubleClick={() => { setTitleDraft(project.name); setIsEditingTitle(true) }}
              className="max-w-48 cursor-text overflow-hidden whitespace-nowrap border-0 bg-transparent text-[13px] font-medium text-accent-white text-ellipsis"
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
          onShare={() => {
            if (!isAuthenticated) {
              setToast({ message: 'Please sign in to share your project.', type: 'error' })
              navigate('/auth/login')
              return
            }
            setShowShareModal(true)
          }}
          onDownload={handleDownload}
          onExport={() => {
            if (!isAuthenticated) {
              setToast({ message: 'Please sign in to export your project.', type: 'error' })
              navigate('/auth/login')
              return
            }
            setShowExportModal(true)
          }}
        />
      </header>

      {/* ── Middle row: Media panel + Preview + Inspector ── */}
      <EditorErrorBoundary onReset={resetProject}>
        <div className="flex flex-1 min-h-0 overflow-hidden gap-0">
          <aside
            className="flex w-96 shrink-0 flex-col overflow-hidden border-r border-dark-border bg-dark/90"
          >
            <MediaLibrary onShowToast={(msg, type) => setToast({ message: msg, type })} isAuthenticated={isAuthenticated} />
          </aside>

          <div
            className="flex min-w-120 flex-1 min-h-0 overflow-hidden bg-background"
          >
            <PreviewPlayer />
          </div>

          {showInspector ? (
            <InspectorPanel />
          ) : null}
        </div>

        {/* ── Toolbar ── */}
        <Toolbar />

        {/* ── Timeline ── */}
        <div className="flex shrink-0 flex-col overflow-hidden border-t border-dark-border bg-dark/95" style={{ height: 260 }}>
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
            background: "var(--color-card)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid var(--color-outline-variant)",
            borderLeft: toast.type === 'success'
              ? "3px solid var(--color-success)"
              : "3px solid var(--color-error)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-card-foreground)",
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
          engineInfo={engineInfo}
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