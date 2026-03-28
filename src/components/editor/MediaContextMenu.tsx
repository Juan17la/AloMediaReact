import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useEditorStore } from "../../store/editorStore"

interface MediaContextMenuProps {
  mediaId: string
  x: number
  y: number
  onClose: () => void
  onInsertAtPlayhead: () => void
}

export function MediaContextMenu({ mediaId, x, y, onClose, onInsertAtPlayhead }: MediaContextMenuProps) {
  const removeMedia = useEditorStore(s => s.removeMedia)
  const proxyMap = useEditorStore(s => s.proxyMap)
  const tracks = useEditorStore(s => s.project.tracks)
  const menuRef = useRef<HTMLDivElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const proxyStatus = proxyMap[mediaId]?.status
  const isProxyPending = proxyStatus === 'pending'

  const clipsUsingMedia = tracks.flatMap(t => t.clips).filter(
    c => 'mediaId' in c && c.mediaId === mediaId,
  )
  const clipCount = clipsUsingMedia.length

  // Clamp position to viewport
  const menuWidth = 200
  const menuHeight = 88
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
        background: "rgba(12, 13, 16, 0.95)",
        backdropFilter: "blur(24px) saturate(150%)",
        WebkitBackdropFilter: "blur(24px) saturate(150%)",
        border: "1px solid rgba(255, 255, 255, 0.10)",
        borderRadius: 10,
        padding: 6,
        boxShadow: "0 4px 12px rgba(0,0,0,0.45), 0 16px 32px rgba(0,0,0,0.35)",
      }}
      className="fixed z-9999 context-menu-enter"
    >
      {!confirmDelete ? (
        <>
          <button
            role="menuitem"
            onClick={handleInsert}
            disabled={isProxyPending}
            title={isProxyPending ? "Proxy not ready yet" : undefined}
            className="w-full text-left disabled:opacity-40 disabled:cursor-not-allowed editor-transition"
            style={{ borderRadius: 6, padding: "8px 12px", fontSize: 13, color: "rgba(255, 255, 255, 0.80)", transition: "background 100ms ease, color 100ms ease" }}
            onMouseEnter={e => { (e.currentTarget).style.background = "rgba(255, 255, 255, 0.08)"; (e.currentTarget).style.color = "rgba(255, 255, 255, 1.0)" }}
            onMouseLeave={e => { (e.currentTarget).style.background = "transparent"; (e.currentTarget).style.color = "rgba(255, 255, 255, 0.80)" }}
          >
            Add to Timeline
          </button>
          <div style={{ height: 1, margin: "4px 0", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />
          <button
            role="menuitem"
            onClick={handleDeleteClick}
            className="w-full text-left editor-transition"
            style={{ borderRadius: 6, padding: "8px 12px", fontSize: 13, color: "rgba(220, 60, 60, 0.90)", transition: "background 100ms ease" }}
            onMouseEnter={e => { (e.currentTarget).style.background = "rgba(255, 255, 255, 0.08)" }}
            onMouseLeave={e => { (e.currentTarget).style.background = "transparent" }}
          >
            Delete Media
          </button>
        </>
      ) : (
        <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.60)", lineHeight: 1.4, margin: 0 }}>
            This will also remove {clipCount} clip{clipCount !== 1 ? 's' : ''}. Confirm?
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleConfirmDelete}
              className="editor-transition"
              style={{ flex: 1, fontSize: 11, color: "rgba(220, 60, 60, 0.90)", border: "1px solid rgba(220, 60, 60, 0.30)", borderRadius: 6, padding: "4px 8px", background: "transparent", cursor: "pointer" }}
            >
              Remove
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="editor-transition"
              style={{ flex: 1, fontSize: 11, color: "rgba(255, 255, 255, 0.60)", border: "1px solid rgba(255, 255, 255, 0.10)", borderRadius: 6, padding: "4px 8px", background: "transparent", cursor: "pointer" }}
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
