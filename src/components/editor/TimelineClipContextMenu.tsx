import { useEffect, useLayoutEffect, useRef } from "react"
import { createPortal } from "react-dom"
import type { Clip } from "../../project/projectTypes"
import { useEditorStore } from "../../store/editorStore"
import { findNextAdjacentOnSameTrack } from "../../utils/transitions"

interface TimelineClipContextMenuProps {
  x: number
  y: number
  clip: Clip
  onClose: () => void
}

const menuPanel = [
  "fixed z-[9999] min-w-52 rounded-sm border border-white/10 p-1.5",
  "modal-glass-card",
  "left-[var(--menu-x)] top-[var(--menu-y)]",
  "animate-[context-menu-enter_120ms_var(--ease-snap)_both]",
].join(" ")

const menuItem = [
  "editor-transition flex w-full items-center justify-between gap-4 rounded-lg border-0 bg-transparent px-3 py-2 text-left text-[13px]",
  "text-white/80 hover:bg-white/8 hover:text-white",
].join(" ")

const menuItemDanger = [
  "editor-transition flex w-full items-center justify-between gap-4 rounded-lg border-0 bg-transparent px-3 py-2 text-left text-[13px]",
  "text-[rgba(220,60,60,0.90)] hover:bg-white/8 hover:text-[rgba(232,78,78,0.95)]",
].join(" ")

const menuItemDisabled = "pointer-events-none opacity-40"

const shortcutHint = "text-[11px] font-mono text-white/45"

export function TimelineClipContextMenu({ x, y, clip, onClose }: TimelineClipContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const tracks = useEditorStore(s => s.project.tracks)
  const setSelectedClip = useEditorStore(s => s.setSelectedClip)
  const copyClip = useEditorStore(s => s.copyClip)
  const pasteClip = useEditorStore(s => s.pasteClip)
  const splitClip = useEditorStore(s => s.splitClip)
  const removeClip = useEditorStore(s => s.removeClip)
  const extractAudioFromClip = useEditorStore(s => s.extractAudioFromClip)
  const setClipOutTransition = useEditorStore(s => s.setClipOutTransition)
  const playhead = useEditorStore(s => s.playhead)
  const clipboard = useEditorStore(s => s.clipboard)

  const canPaste = !!clipboard
  const canExtractAudio = clip.type === "video"
  const track = tracks.find(t => t.id === clip.trackId)
  const nextSameTrackClip = track
    ? findNextAdjacentOnSameTrack(clip, track.clips)
    : undefined
  const canAddTransitionOut = clip.type === "video" && nextSameTrackClip?.type === "video"

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

      <div className="my-1 h-px bg-linear-to-r from-transparent via-white/8 to-transparent" />

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
        className={`${menuItem} ${canAddTransitionOut ? "" : menuItemDisabled}`}
        onClick={() => {
          if (!canAddTransitionOut) return
          runAction(() => setClipOutTransition(clip.id, { type: "fade", duration: 0.4 }))
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
