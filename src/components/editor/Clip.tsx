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
  const [resizeHovered, setResizeHovered] = useState(false)

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
        style={{
          position: "absolute",
          left,
          width: Math.max(width, 4),
          top: 2,
          bottom: 2,
          background: isSelected ? "rgba(180,20,20,0.22)" : "rgba(180,20,20,0.10)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          border: isSelected ? "1px solid rgba(220,40,40,0.75)" : "1px solid rgba(180,20,20,0.20)",
          ...(isSelected ? {} : { borderTop: "1px solid rgba(180,20,20,0.38)" }),
          borderRadius: 6,
          cursor: isDragging ? "grabbing" : "grab",
          overflow: "hidden",
          boxSizing: "border-box",
          userSelect: "none",
          opacity: isDragging ? 0.7 : 1,
          boxShadow: isSelected
            ? "inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 6px rgba(0,0,0,0.30), 0 0 0 2px rgba(180,20,20,0.40)"
            : "inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 6px rgba(0,0,0,0.30)",
          transition: "background 120ms ease, border-color 120ms ease, box-shadow 120ms ease",
          backgroundImage: isAudio ? AUDIO_WAVEFORM_BG : undefined,
          backgroundRepeat: isAudio ? "repeat-x" : undefined,
          backgroundPosition: isAudio ? "0 center" : undefined,
        }}
      >
        {/* Left edge in-point indicator */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: "var(--color-dark-border-light)",
            flexShrink: 0,
          }}
        />

        {/* Clip label */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            padding: "0 6px 0 6px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "block",
            lineHeight: "100%",
            color: "rgba(255,255,255,0.85)",
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            left: 3,
            right: 14,
          }}
        >
          {getClipLabel()}
        </span>

        {/* Right resize handle */}
        <div
          onMouseDown={handleResizeMouseDown}
          onMouseEnter={() => setResizeHovered(true)}
          onMouseLeave={() => setResizeHovered(false)}
          className="clip-resize-handle"
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 12,
            cursor: "ew-resize",
          }}
        />
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "rgba(12, 13, 16, 0.95)",
            backdropFilter: "blur(24px) saturate(150%)",
            WebkitBackdropFilter: "blur(24px) saturate(150%)",
            border: "1px solid rgba(255, 255, 255, 0.10)",
            borderRadius: 10,
            padding: 6,
            zIndex: 100,
            minWidth: 160,
            boxShadow: "0 4px 12px rgba(0,0,0,0.45), 0 16px 32px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "rgba(255, 255, 255, 0.80)", borderRadius: 6, transition: "background 100ms ease, color 100ms ease" }}
            onClick={e => { e.stopPropagation(); splitClip(clip.id, playhead); setContextMenu(null) }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255, 255, 255, 0.08)"; (e.currentTarget as HTMLDivElement).style.color = "rgba(255, 255, 255, 1.0)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; (e.currentTarget as HTMLDivElement).style.color = "rgba(255, 255, 255, 0.80)" }}
          >
            Split at playhead
          </div>
          {clip.type === "video" && (
            <div
              style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "rgba(255, 255, 255, 0.80)", borderRadius: 6, transition: "background 100ms ease, color 100ms ease" }}
              onClick={e => { e.stopPropagation(); extractAudioFromClip(clip.id); setContextMenu(null) }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255, 255, 255, 0.08)"; (e.currentTarget as HTMLDivElement).style.color = "rgba(255, 255, 255, 1.0)" }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; (e.currentTarget as HTMLDivElement).style.color = "rgba(255, 255, 255, 0.80)" }}
            >
              Extract Audio
            </div>
          )}
          <div style={{ height: 1, margin: "4px 0", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />
          <div
            style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "rgba(220, 60, 60, 0.90)", borderRadius: 6, transition: "background 100ms ease" }}
            onClick={e => { e.stopPropagation(); removeClip(clip.id); setContextMenu(null) }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255, 255, 255, 0.08)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent" }}
          >
            Remove clip
          </div>
        </div>
      )}
    </>
  )
}
