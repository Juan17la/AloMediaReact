import type { DragEvent } from "react"
import type { Track } from "../../project/projectTypes"
import { ClipComponent } from "./Clip"
import { useEditorStore } from "../../store/editorStore"

interface TrackProps {
  track: Track
  dragOverTrackId: string | undefined
  setDragOverTrack: (id: string | undefined) => void
  onDrop: (trackId: string, mediaId: string, e: DragEvent<HTMLDivElement>) => void
  onClipDrop: (e: DragEvent<HTMLDivElement>, targetTrackId: string) => void
}

export function TrackComponent({ track, dragOverTrackId, setDragOverTrack, onDrop, onClipDrop }: TrackProps) {
  const selectedClipId = useEditorStore(s => s.selectedClipId)
  const setSelectedClip = useEditorStore(s => s.setSelectedClip)
  const scale = useEditorStore(s => s.timelineScale)

  const isOver = dragOverTrackId === track.id

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOverTrack(track.id)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    // Only clear if leaving the track container itself, not a child
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTrack(undefined)
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOverTrack(undefined)
    const mediaId = e.dataTransfer.getData("mediaId")
    const clipId = e.dataTransfer.getData("clipId")
    if (mediaId) {
      onDrop(track.id, mediaId, e)
    } else if (clipId) {
      onClipDrop(e, track.id)
    }
  }

  function handleClipDragStart(e: DragEvent<HTMLDivElement>, clipId: string) {
    // Store the clip id and the mouse offset from the clip's left edge
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    e.dataTransfer.setData("clipId", clipId)
    e.dataTransfer.setData("clipOffsetX", String(offsetX))
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        position: "relative",
        height: 60,
        backgroundColor: isOver ? "#1e293b" : "#0f172a",
        borderBottom: "1px solid #1e293b",
        minWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Track label */}
      <div style={{ position: "absolute", left: 4, top: 4, fontSize: 10, color: "#475569", pointerEvents: "none", zIndex: 1 }}>
        {track.type}
      </div>

      {track.clips.map(clip => (
        <ClipComponent
          key={clip.id}
          clip={clip}
          scale={scale}
          isSelected={selectedClipId === clip.id}
          onSelect={setSelectedClip}
          onDragStart={handleClipDragStart}
        />
      ))}
    </div>
  )
}
