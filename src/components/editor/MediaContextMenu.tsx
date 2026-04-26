import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useEditorStore } from "../../store/editorStore"
import type { MediaType } from "../../project/projectTypes"

interface MediaContextMenuProps {
  mediaId: string
  mediaType: MediaType
  x: number
  y: number
  onClose: () => void
  onInsertAtPlayhead: () => void
  onImportSubtitles?: () => void
  onOpenAiTools?: (tool: "clean" | "transcribe") => void
  isImportingSubtitles?: boolean
}

const menuPanel =
  "fixed z-9999 context-menu-enter min-w-50 rounded-[10px] border border-dark-border bg-dark p-1.5 shadow-[0_4px_12px_rgba(26,26,31,0.08),0_16px_32px_rgba(26,26,31,0.08)] backdrop-blur-2xl"

const menuAction =
  "w-full rounded-md px-3 py-2 text-left text-[13px] transition-[background,color] duration-100"

const menuActionNeutral =
  "text-accent-white/80 hover:bg-dark-card hover:text-accent-white"

const menuActionDanger =
  "text-[rgba(170,58,74,0.92)] hover:bg-[rgba(212,80,90,0.10)]"

export function MediaContextMenu({
  mediaId,
  mediaType,
  x,
  y,
  onClose,
  onInsertAtPlayhead,
  onImportSubtitles,
  onOpenAiTools,
  isImportingSubtitles,
}: MediaContextMenuProps) {
  const removeMedia = useEditorStore(s => s.removeMedia)
  const proxyMap = useEditorStore(s => s.proxyMap)
  const tracks = useEditorStore(s => s.project.tracks)
  const menuRef = useRef<HTMLDivElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const proxyStatus = proxyMap[mediaId]?.status
  const isProxyPending = proxyStatus === 'pending'
  const isSubtitles = mediaType === "subtitles"
  const isAudio = mediaType === "audio"

  const clipsUsingMedia = tracks.flatMap(t => t.clips).filter(
    c => 'mediaId' in c && c.mediaId === mediaId,
  )
  const clipCount = clipsUsingMedia.length

  // Clamp position to viewport
  const menuWidth = 200
  const menuHeight = confirmDelete ? 104 : isSubtitles ? 120 : isAudio && onOpenAiTools ? 168 : 88
  const clampedX = Math.min(x, window.innerWidth - menuWidth - 8)
  const clampedY = Math.min(y, window.innerHeight - menuHeight - 8)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function onScroll() { onClose() }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [onClose])

  function handleInsert() {
    if (isProxyPending) return
    onInsertAtPlayhead()
    onClose()
  }

  function handleImportSubtitles() {
    if (!onImportSubtitles || isImportingSubtitles) return
    onImportSubtitles()
    onClose()
  }

  function handleOpenAiTools(tool: "clean" | "transcribe") {
    if (!onOpenAiTools) return
    onOpenAiTools(tool)
    onClose()
  }

  function handleDeleteClick() {
    if (clipCount > 0) {
      setConfirmDelete(true)
    } else {
      removeMedia(mediaId)
      onClose()
    }
  }

  function handleConfirmDelete() {
    removeMedia(mediaId)
    onClose()
  }

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        left: clampedX,
        top: clampedY,
        width: menuWidth,
      }}
      className={menuPanel}
    >
      {!confirmDelete ? (
        <>
          {isSubtitles ? (
            <button
              role="menuitem"
              onClick={handleImportSubtitles}
              disabled={isImportingSubtitles || !onImportSubtitles}
              className={`${menuAction} ${menuActionNeutral} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {isImportingSubtitles ? "Importing..." : "Import as Subtitles"}
            </button>
          ) : (
            <button
              role="menuitem"
              onClick={handleInsert}
              disabled={isProxyPending}
              title={isProxyPending ? "Proxy not ready yet" : undefined}
              className={`${menuAction} ${menuActionNeutral} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              Add to Timeline
            </button>
          )}
          {isAudio && onOpenAiTools && (
            <>
              <button
                role="menuitem"
                onClick={() => handleOpenAiTools("clean")}
                className={`${menuAction} ${menuActionNeutral}`}
              >
                Clean Audio
              </button>
              <button
                role="menuitem"
                onClick={() => handleOpenAiTools("transcribe")}
                className={`${menuAction} ${menuActionNeutral}`}
              >
                Transcript
              </button>
              <div className="my-1 h-px bg-linear-to-r from-transparent via-dark-border to-transparent" />
            </>
          )}
          {!isAudio && <div className="my-1 h-px bg-linear-to-r from-transparent via-dark-border to-transparent" />}
          <button
            role="menuitem"
            onClick={handleDeleteClick}
            className={`${menuAction} ${menuActionDanger}`}
          >
            Delete Media
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-2 px-3 py-2">
          <p className="m-0 text-xs leading-[1.4] text-muted">
            This will also remove {clipCount} clip{clipCount !== 1 ? 's' : ''}. Confirm?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmDelete}
              className="flex-1 rounded-md border border-[rgba(170,58,74,0.28)] bg-transparent px-2 py-1 text-[11px] text-[rgba(170,58,74,0.92)] transition-colors duration-100 hover:bg-[rgba(212,80,90,0.10)]"
            >
              Remove
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 rounded-md border border-dark-border bg-transparent px-2 py-1 text-[11px] text-accent-white/70 transition-colors duration-100 hover:bg-dark-card"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
