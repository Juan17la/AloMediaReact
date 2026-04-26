import { useEffect, useLayoutEffect, useRef } from "react"
import { createPortal } from "react-dom"
import type { Clip } from "../../project/projectTypes"
import { useEditorStore } from "../../store/editorStore"

interface TimelineClipContextMenuProps {
  x: number
  y: number
  clip: Clip
  onClose: () => void
}

const menuPanel = [
  "fixed z-[9999] min-w-52 rounded-sm border border-dark-border p-1.5",
  "modal-glass-card",
  "left-[var(--menu-x)] top-[var(--menu-y)]",
  "animate-[context-menu-enter_120ms_var(--ease-snap)_both]",
].join(" ")

const menuItem = [
  "editor-transition flex w-full items-center justify-between gap-4 rounded-lg border-0 bg-transparent px-3 py-2 text-left text-[13px]",
  "text-accent-white/80 hover:bg-dark-card hover:text-accent-white",
].join(" ")

const menuItemDanger = [
  "editor-transition flex w-full items-center justify-between gap-4 rounded-lg border-0 bg-transparent px-3 py-2 text-left text-[13px]",
  "text-[rgba(166,60,74,0.92)] hover:bg-[rgba(212,80,90,0.10)] hover:text-[rgba(166,60,74,1)]",
].join(" ")

const menuItemDisabled = "pointer-events-none opacity-40"

const shortcutHint = "text-[11px] font-mono text-muted"

const DEFAULT_TRANSITION = { type: "fade" as const, duration: 0.4 }

export function TimelineClipContextMenu({ x, y, clip, onClose }: TimelineClipContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const setSelectedClip = useEditorStore(s => s.setSelectedClip)
  const setSelectedTransitionClip = useEditorStore(s => s.setSelectedTransitionClip)
  const setClipTransitionIn = useEditorStore(s => s.setClipTransitionIn)
  const copyClip = useEditorStore(s => s.copyClip)
  const pasteClip = useEditorStore(s => s.pasteClip)
  const splitClip = useEditorStore(s => s.splitClip)
  const removeClip = useEditorStore(s => s.removeClip)
  const extractAudioFromClip = useEditorStore(s => s.extractAudioFromClip)
  const setClipTransitionOut = useEditorStore(s => s.setClipTransitionOut)
  const selectedClipIds = useEditorStore(s => s.selectedClipIds)
  const createGroupFromSelection = useEditorStore(s => s.createGroupFromSelection)
  const ungroupSelected = useEditorStore(s => s.ungroupSelected)
  const enterGroupEditMode = useEditorStore(s => s.enterGroupEditMode)
  const project = useEditorStore(s => s.project)
  const playhead = useEditorStore(s => s.playhead)
  const clipboard = useEditorStore(s => s.clipboard)

  const canPaste = !!clipboard
  const canExtractAudio = clip.type === "video"
  const canAddTransitionIn = clip.type === "video"
  const canAddTransitionOut = clip.type === "video"
  const containingGroup = (project.clipGroups ?? []).find(group => group.memberClipIds.includes(clip.id))
  const canCreateGroup = selectedClipIds.length >= 2
  const canUngroup = selectedClipIds.some(id => (project.clipGroups ?? []).some(group => group.memberClipIds.includes(id)))

  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) return

    const margin = 8
    const rect = menu.getBoundingClientRect()
    const willOverflowRight = x + rect.width + margin > window.innerWidth
    const willOverflowBottom = y + rect.height + margin > window.innerHeight

    const nextX = willOverflowRight
      ? Math.max(margin, x - rect.width)
      : Math.min(x, window.innerWidth - rect.width - margin)
    const nextY = willOverflowBottom
      ? Math.max(margin, y - rect.height)
      : Math.min(y, window.innerHeight - rect.height - margin)

    menu.style.setProperty("--menu-x", `${nextX}px`)
    menu.style.setProperty("--menu-y", `${nextY}px`)
  }, [x, y])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose()
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("pointerdown", handlePointerDown, true)
    document.addEventListener("keydown", handleKeyDown, true)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true)
      document.removeEventListener("keydown", handleKeyDown, true)
    }
  }, [onClose])

  function runAction(action: () => void) {
    action()
    onClose()
  }

  return createPortal(
    <div ref={menuRef} role="menu" className={menuPanel}>
      <button
        type="button"
        role="menuitem"
        className={menuItem}
        onClick={() => runAction(() => {
          setSelectedClip(clip.id)
          copyClip()
        })}
      >
        <span>Copy</span>
        <span className={shortcutHint}>Ctrl + C</span>
      </button>

      <div className="my-1 h-px bg-linear-to-r from-transparent via-dark-border to-transparent" />

      <button
        type="button"
        role="menuitem"
        className={`${menuItem} ${canCreateGroup ? "" : menuItemDisabled}`}
        onClick={() => {
          if (!canCreateGroup) return
          runAction(() => createGroupFromSelection())
        }}
      >
        <span>Group Selection</span>
        <span className={shortcutHint}>Ctrl + G</span>
      </button>

      <button
        type="button"
        role="menuitem"
        className={`${menuItem} ${containingGroup ? "" : menuItemDisabled}`}
        onClick={() => {
          if (!containingGroup) return
          runAction(() => enterGroupEditMode(containingGroup.id))
        }}
      >
        <span>Edit Group Members</span>
        <span className={shortcutHint} />
      </button>

      <button
        type="button"
        role="menuitem"
        className={`${menuItem} ${canUngroup ? "" : menuItemDisabled}`}
        onClick={() => {
          if (!canUngroup) return
          runAction(() => ungroupSelected())
        }}
      >
        <span>Ungroup</span>
        <span className={shortcutHint}>Ctrl + Shift + G</span>
      </button>

      <button
        type="button"
        role="menuitem"
        className={menuItem}
        onClick={() => runAction(() => {
          setSelectedClip(clip.id)
          copyClip()
          removeClip(clip.id)
        })}
      >
        <span>Cut</span>
        <span className={shortcutHint}>Ctrl + X</span>
      </button>

      <button
        type="button"
        role="menuitem"
        className={`${menuItem} ${canPaste ? "" : menuItemDisabled}`}
        onClick={() => {
          if (!canPaste) return
          runAction(() => pasteClip())
        }}
      >
        <span>Paste</span>
        <span className={shortcutHint}>Ctrl + V</span>
      </button>

      <div className="my-1 h-px bg-linear-to-r from-transparent via-dark-border to-transparent" />

      <button
        type="button"
        role="menuitem"
        className={menuItem}
        onClick={() => runAction(() => splitClip(clip.id, playhead))}
      >
        <span>Split</span>
        <span className={shortcutHint}>Ctrl + S</span>
      </button>

      <button
        type="button"
        role="menuitem"
        className={`${menuItem} ${canExtractAudio ? "" : menuItemDisabled}`}
        onClick={() => {
          if (!canExtractAudio) return
          runAction(() => extractAudioFromClip(clip.id))
        }}
      >
        <span>Extract Audio</span>
        <span className={shortcutHint} />
      </button>

      <button
        type="button"
        role="menuitem"
        className={`${menuItem} ${canAddTransitionIn ? "" : menuItemDisabled}`}
        onClick={() => {
          if (!canAddTransitionIn) return
          runAction(() => {
            const current = clip.type === "video" ? clip.transitionIn : undefined
            setClipTransitionIn(clip.id, current ?? DEFAULT_TRANSITION)
            setSelectedTransitionClip(clip.id)
          })
        }}
      >
        <span>Add Transition In</span>
        <span className={shortcutHint} />
      </button>

      <button
        type="button"
        role="menuitem"
        className={`${menuItem} ${canAddTransitionOut ? "" : menuItemDisabled}`}
        onClick={() => {
          if (!canAddTransitionOut) return
          runAction(() => {
            const current = clip.type === "video" ? clip.transitionOut : undefined
            setClipTransitionOut(clip.id, current ?? DEFAULT_TRANSITION)
            setSelectedTransitionClip(clip.id)
          })
        }}
      >
        <span>Add Transition Out</span>
        <span className={shortcutHint} />
      </button>

      <div className="my-1 h-px bg-linear-to-r from-transparent via-white/8 to-transparent" />

      <button
        type="button"
        role="menuitem"
        className={menuItemDanger}
        onClick={() => runAction(() => removeClip(clip.id))}
      >
        <span>Delete</span>
        <span className={shortcutHint}>⌫</span>
      </button>
    </div>,
    document.body,
  )
}
