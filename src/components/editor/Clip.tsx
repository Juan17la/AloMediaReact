import { useState, useEffect, useRef, type DragEvent } from "react"
import type { Clip } from "../../project/projectTypes"
import { timeToPx, pxToTime } from "../../utils/time"
import { useEditorStore } from "../../store/editorStore"

interface ClipProps {
  clip: Clip
  scale: number
  isSelected: boolean
  onSelect: (clipId: string) => void
  onDragStart: (e: DragEvent<HTMLDivElement>, clipId: string) => void
  onDragEnd: () => void
}

// Audio waveform: static decorative SVG as CSS background
const AUDIO_WAVEFORM_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect x='2' y='6' width='2' height='8' fill='rgba(100,200,100,0.18)' /%3E%3Crect x='6' y='3' width='2' height='14' fill='rgba(100,200,100,0.18)' /%3E%3Crect x='10' y='7' width='2' height='6' fill='rgba(100,200,100,0.18)' /%3E%3Crect x='14' y='4' width='2' height='12' fill='rgba(100,200,100,0.18)' /%3E%3Crect x='18' y='8' width='2' height='4' fill='rgba(100,200,100,0.18)' /%3E%3C/svg%3E")`

// Clip base styling
const clipBase =
  "absolute top-0.5 bottom-0.5 rounded-md overflow-hidden box-border select-none transition-[background,border-color,box-shadow] duration-[120ms] ease-out backdrop-blur-sm"

// Clip selected state: brighter, higher contrast
const clipSelected =
  "bg-[rgba(180,20,20,0.22)] border border-[rgba(220,40,40,0.75)] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_2px_6px_rgba(0,0,0,0.30)] ring-2 ring-[rgba(180,20,20,0.40)]"

// Clip unselected state: dimmer, lower contrast
const clipUnselected =
  "bg-[rgba(180,20,20,0.10)] border border-[rgba(180,20,20,0.20)] border-t-[rgba(180,20,20,0.38)] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_2px_6px_rgba(0,0,0,0.30)]"

// Clip cursor states
const clipCursorGrabbing = "cursor-grabbing opacity-70"
const clipCursorGrab = "cursor-grab opacity-100"

// Clip resize handle
const clipResizeHandle =
  "clip-resize-handle absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize"

export function ClipComponent({ clip, scale, isSelected, onSelect, onDragStart, onDragEnd }: ClipProps) {
  const playhead = useEditorStore(s => s.playhead)
  const splitClip = useEditorStore(s => s.splitClip)
  const removeClip = useEditorStore(s => s.removeClip)
  const extractAudioFromClip = useEditorStore(s => s.extractAudioFromClip)
  const resizeClip = useEditorStore(s => s.resizeClip)
  const pushHistory = useEditorStore(s => s.pushHistory)
  const projectMedia = useEditorStore(s => s.project.media)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function getClipLabel(): string {
    if (clip.type === "text") return clip.content || "Text"
    const media = projectMedia.find(m => m.id === clip.mediaId)
    return media?.name ?? clip.type
  }

  useEffect(() => {
    if (!contextMenu) return
    function handleMouseDown(event: MouseEvent) {
      if (!contextMenuRef.current?.contains(event.target as Node)) {
        setContextMenu(null)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [contextMenu])

  const left = timeToPx(clip.timelineStart, scale)
  const width = timeToPx(clip.timelineEnd - clip.timelineStart, scale)

  const isAudio = clip.type === "audio"

  function handleResizeMouseDown(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const originalEnd = clip.timelineEnd

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX
      const newEnd = Math.max(clip.timelineStart + 0.5, originalEnd + pxToTime(dx, scale))
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
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  return (
    <>
      <div
        draggable
        onDragStart={e => {
          setIsDragging(true)
          e.dataTransfer.setData("clipDuration", String(clip.timelineEnd - clip.timelineStart))
          onDragStart(e, clip.id)
        }}
        onDragEnd={() => {
          setIsDragging(false)
          onDragEnd()
          window.dispatchEvent(new CustomEvent("alomedia:drag-end"))
        }}
        onClick={() => onSelect(clip.id)}
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
        <div className="absolute left-0 top-0 bottom-0 w-0.75 bg-dark-border-light shrink-0" />

        {/* Clip label */}
        <span className="absolute top-1/2 -translate-y-1/2 left-0.75 right-3.5 block text-[11px] font-medium px-1.5 whitespace-nowrap overflow-hidden text-ellipsis leading-none text-white/85">
          {getClipLabel()}
        </span>

        {/* Right resize handle */}
        <div className={clipResizeHandle} onMouseDown={handleResizeMouseDown} />
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-100 min-w-40 rounded-[10px] p-1.5 bg-[rgba(12,13,16,0.95)] border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.45),0_16px_32px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          <div
            className="px-3 py-2 cursor-pointer text-[13px] text-white/80 rounded-md transition-[background,color] duration-100 hover:bg-white/8 hover:text-white"
            onClick={e => { e.stopPropagation(); splitClip(clip.id, playhead); setContextMenu(null) }}
          >
            Split at playhead
          </div>
          {clip.type === "video" && (
            <div
              className="px-3 py-2 cursor-pointer text-[13px] text-white/80 rounded-md transition-[background,color] duration-100 hover:bg-white/8 hover:text-white"
              onClick={e => { e.stopPropagation(); extractAudioFromClip(clip.id); setContextMenu(null) }}
            >
              Extract Audio
            </div>
          )}
          <div className="h-px my-1 bg-linear-to-r from-transparent via-white/8 to-transparent" />
          <div
            className="px-3 py-2 cursor-pointer text-[13px] text-[rgba(220,60,60,0.90)] rounded-md transition-[background] duration-100 hover:bg-white/8"
            onClick={e => { e.stopPropagation(); removeClip(clip.id); setContextMenu(null) }}
          >
            Remove clip
          </div>
        </div>
      )}
    </>
  )
}
