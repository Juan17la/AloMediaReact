import { useState, useEffect, type DragEvent } from "react"
import type { Clip } from "../../project/projectTypes"
import { timeToPx } from "../../utils/time"
import { useEditorStore } from "../../store/editorStore"

interface ClipProps {
  clip: Clip
  scale: number
  isSelected: boolean
  onSelect: (clipId: string) => void
  onDragStart: (e: DragEvent<HTMLDivElement>, clipId: string) => void
}

function getClipLabel(clip: Clip): string {
  if (clip.type === "text") return clip.content || "Text"
  return clip.mediaId
}

export function ClipComponent({ clip, scale, isSelected, onSelect, onDragStart }: ClipProps) {
  const playhead = useEditorStore(s => s.playhead)
  const splitClip = useEditorStore(s => s.splitClip)
  const removeClip = useEditorStore(s => s.removeClip)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  // Close the context menu when the user clicks anywhere outside it
  useEffect(() => {
    if (!contextMenu) return
    function close() { setContextMenu(null) }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [contextMenu])

  const left = timeToPx(clip.timelineStart, scale)
  const width = timeToPx(clip.timelineEnd - clip.timelineStart, scale)

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  return (
    <>
      <div
        draggable
        onDragStart={e => onDragStart(e, clip.id)}
        onClick={() => onSelect(clip.id)}
        onContextMenu={handleContextMenu}
        style={{
          position: "absolute",
          left,
          width: Math.max(width, 4),
          top: 4,
          bottom: 4,
          backgroundColor: isSelected ? "#3b82f6" : "#6366f1",
          border: isSelected ? "2px solid #1d4ed8" : "1px solid #4338ca",
          borderRadius: 4,
          cursor: "grab",
          overflow: "hidden",
          boxSizing: "border-box",
          userSelect: "none",
        }}
      >
        <div style={{ padding: "2px 6px", fontSize: 11, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {getClipLabel(clip)}
        </div>
      </div>

      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 4,
            zIndex: 100,
            minWidth: 160,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{ padding: "6px 12px", cursor: "pointer", fontSize: 13, color: "#e2e8f0" }}
            onClick={e => { e.stopPropagation(); splitClip(clip.id, playhead); setContextMenu(null) }}
          >
            Split at playhead
          </div>
          <div
            style={{ padding: "6px 12px", cursor: "pointer", fontSize: 13, color: "#f87171" }}
            onClick={e => { e.stopPropagation(); removeClip(clip.id); setContextMenu(null) }}
          >
            Remove clip
          </div>
        </div>
      )}
    </>
  )
}
