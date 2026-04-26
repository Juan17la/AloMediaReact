import { useState, type DragEvent } from "react"
import type { Clip } from "../../project/projectTypes"
import { getMediaBackedClipMaxTimelineEnd, timeToPx, pxToTime } from "../../utils/time"
import { useEditorStore } from "../../store/editorStore"
import { TimelineClipContextMenu } from "./TimelineClipContextMenu"

interface ClipProps {
  clip: Clip
  scale: number
  isSelected: boolean
  onSelect: (clipId: string, options?: { toggle?: boolean }) => void
  onDragStart: (e: DragEvent<HTMLDivElement>, clipId: string) => void
  onDragEnd: () => void
}

// Audio waveform: static decorative SVG as CSS background
const AUDIO_WAVEFORM_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect x='2' y='6' width='2' height='8' fill='rgba(100,200,100,0.18)' /%3E%3Crect x='6' y='3' width='2' height='14' fill='rgba(100,200,100,0.18)' /%3E%3Crect x='10' y='7' width='2' height='6' fill='rgba(100,200,100,0.18)' /%3E%3Crect x='14' y='4' width='2' height='12' fill='rgba(100,200,100,0.18)' /%3E%3Crect x='18' y='8' width='2' height='4' fill='rgba(100,200,100,0.18)' /%3E%3C/svg%3E")`

// Clip base styling - no glass effects
const clipBase =
  "absolute top-0.5 bottom-0.5 rounded-md overflow-hidden box-border select-none transition-[background,border-color,box-shadow] duration-[120ms] ease-out"

// Clip selected state - solid primary color with subtle gradient
const clipSelected =
  "bg-linear-to-b from-primary/90 to-primary border border-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_8px_rgba(99,14,212,0.35)] ring-2 ring-primary/40"

// Clip unselected state - subtle purple with gradient for depth
const clipUnselected =
  "bg-linear-to-b from-primary/70 to-primary/55 border border-primary/50 border-t-primary/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_3px_rgba(0,0,0,0.15)]"

// Clip cursor states
const clipCursorGrabbing = "cursor-grabbing opacity-70"
const clipCursorGrab = "cursor-grab opacity-100"

// Clip resize handle
const clipResizeHandle =
  "clip-resize-handle absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize"

export function ClipComponent({ clip, scale, isSelected, onSelect, onDragStart, onDragEnd }: ClipProps) {
  const resizeClip = useEditorStore(s => s.resizeClip)
  const pushHistory = useEditorStore(s => s.pushHistory)
  const projectMedia = useEditorStore(s => s.project.media)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; clip: Clip } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function isEditableElement(target: EventTarget | null): boolean {
    if (!target) return false
    const el = target as HTMLElement
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true
    if (el.isContentEditable) return true
    return !!el.closest("[contenteditable='true']")
  }

  function getClipLabel(): string {
    if (clip.type === "text") return clip.content || "Text"
    const media = projectMedia.find(m => m.id === clip.mediaId)
    return media?.name ?? clip.type
  }

  const left = timeToPx(clip.timelineStart, scale)
  const width = timeToPx(clip.timelineEnd - clip.timelineStart, scale)

  const isAudio = clip.type === "audio"

  function handleResizeMouseDown(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const originalEnd = clip.timelineEnd
    const maxEnd = getMediaBackedClipMaxTimelineEnd(clip) ?? Number.POSITIVE_INFINITY

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX
      const newEnd = Math.max(clip.timelineStart + 0.5, Math.min(originalEnd + pxToTime(dx, scale), maxEnd))
      resizeClip(clip.id, newEnd)
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      pushHistory("Resize image clip")
    }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }

  function handleContextMenu(e: React.MouseEvent) {
    if (isEditableElement(e.target)) return
    e.preventDefault()
    e.stopPropagation()
    onSelect(clip.id)
    setContextMenu({ x: e.clientX, y: e.clientY, clip })
  }

  return (
    <>
      <div
        draggable
        data-clip-id={clip.id}
        data-track-id={clip.trackId}
        onDragStart={e => {
          setIsDragging(true)
          e.dataTransfer.setData("clipDuration", String(clip.timelineEnd - clip.timelineStart))
          e.dataTransfer.setData("clipTimelineStart", String(clip.timelineStart))
          onDragStart(e, clip.id)
        }}
        onDragEnd={() => {
          setIsDragging(false)
          onDragEnd()
          window.dispatchEvent(new CustomEvent("alomedia:drag-end"))
        }}
        onClick={(e) => onSelect(clip.id, { toggle: e.ctrlKey || e.metaKey })}
        onContextMenu={handleContextMenu}
        className={[
          clipBase,
          isSelected ? clipSelected : clipUnselected,
          isDragging ? clipCursorGrabbing : clipCursorGrab,
        ].join(" ")}
        style={{
          left,
          width: Math.max(width, 4),
          ...(isAudio ? { backgroundImage: AUDIO_WAVEFORM_BG, backgroundRepeat: "repeat-x", backgroundPosition: "0 center" } : {}),
        }}
      >
        {/* Left edge in-point indicator */}
        <div className="absolute left-0 top-0 bottom-0 w-0.75 bg-on-surface/30 shrink-0" />

        {/* Clip label */}
        <span className="absolute top-1/2 -translate-y-1/2 left-0.75 right-3.5 block text-[11px] font-semibold px-1.5 whitespace-nowrap overflow-hidden text-ellipsis leading-none text-on-primary">
          {getClipLabel()}
        </span>

        {/* Right resize handle */}
        <div className={clipResizeHandle} onMouseDown={handleResizeMouseDown} />
      </div>

      {contextMenu && (
        <TimelineClipContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          clip={contextMenu.clip}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}
