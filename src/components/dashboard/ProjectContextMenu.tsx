import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { History, Trash2 } from "lucide-react"

interface ProjectContextMenuProps {
  projectId: number
  x: number
  y: number
  onClose: () => void
  onViewHistory: (id: number) => void
  onDelete: (id: number) => void
}

const menuPanel =
  "fixed z-[9999] min-w-48 rounded-lg border border-outline-variant bg-surface-container p-1.5 shadow-xl"

const menuAction =
  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] transition-colors duration-100"

const menuActionNeutral =
  "text-on-surface/80 hover:bg-surface-container-high hover:text-on-surface"

const menuActionDanger =
  "text-error hover:bg-error/10"

export function ProjectContextMenu({
  projectId,
  x,
  y,
  onClose,
  onViewHistory,
  onDelete,
}: ProjectContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const menuWidth = 192
  const menuHeight = 96
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

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ left: clampedX, top: clampedY }}
      className={menuPanel}
    >
      <button
        role="menuitem"
        onClick={() => { onViewHistory(projectId); onClose() }}
        className={`${menuAction} ${menuActionNeutral}`}
      >
        <History className="h-4 w-4" />
        <span>View History</span>
      </button>
      <div className="my-1 h-px bg-linear-to-r from-transparent via-outline-variant to-transparent" />
      <button
        role="menuitem"
        onClick={() => { onDelete(projectId); onClose() }}
        className={`${menuAction} ${menuActionDanger}`}
      >
        <Trash2 className="h-4 w-4" />
        <span>Delete</span>
      </button>
    </div>,
    document.body,
  )
}