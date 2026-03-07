import type { DragEvent } from "react"
import { useRef } from "react"
import { useEditorStore } from "../../store/editorStore"
import { useTimeline } from "../../hooks/useTimeline"
import { getProjectDuration, timeToPx, pxToTime } from "../../utils/time"
import { generateId } from "../../utils/id"
import type { Clip, Transform } from "../../project/projectTypes"
import { TrackComponent } from "./Track"
import { PlayheadBar } from "./PlayheadBar"

const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, width: 1280, height: 720, rotation: 0 }

export function Timeline() {
  const project = useEditorStore(s => s.project)
  const playhead = useEditorStore(s => s.playhead)
  const timelineScale = useEditorStore(s => s.timelineScale)
  const addClip = useEditorStore(s => s.addClip)
  const moveClip = useEditorStore(s => s.moveClip)
  const containerRef = useRef<HTMLDivElement>(null)

  const { xToTime, hasCollision, dragOverTrackId, setDragOverTrack } = useTimeline()

  const duration = getProjectDuration(project.tracks)
  // Always show at least 30 seconds of ruler
  const rulerDuration = duration + 10

  function handleMediaDrop(trackId: string, mediaId: string, e: DragEvent<HTMLDivElement>) {
    const track = project.tracks.find(t => t.id === trackId)
    if (!track) return
    const media = project.media.find(m => m.id === mediaId)
    if (!media) return

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const timelineStart = Math.max(0, xToTime(mouseX))
    const clipDuration = media.duration ?? 5
    const timelineEnd = timelineStart + clipDuration

    if (hasCollision(trackId, timelineStart, timelineEnd)) return

    let newClip: Clip

    if (media.type === "video") {
      newClip = {
        id: generateId(),
        trackId,
        timelineStart,
        timelineEnd,
        type: "video",
        mediaId: media.id,
        mediaStart: 0,
        mediaEnd: clipDuration,
        volume: 1,
        transform: DEFAULT_TRANSFORM,
      }
    } else if (media.type === "audio") {
      newClip = {
        id: generateId(),
        trackId,
        timelineStart,
        timelineEnd,
        type: "audio",
        mediaId: media.id,
        mediaStart: 0,
        mediaEnd: clipDuration,
        volume: 1,
      }
    } else {
      newClip = {
        id: generateId(),
        trackId,
        timelineStart,
        timelineEnd,
        type: "image",
        mediaId: media.id,
        transform: DEFAULT_TRANSFORM,
      }
    }

    addClip(newClip)
  }

  function handleClipDrop(e: DragEvent<HTMLDivElement>, targetTrackId: string) {
    const clipId = e.dataTransfer.getData("clipId")
    const offsetX = parseFloat(e.dataTransfer.getData("clipOffsetX") || "0")

    let sourceClip: Clip | undefined
    for (const track of project.tracks) {
      sourceClip = track.clips.find(c => c.id === clipId)
      if (sourceClip) break
    }
    if (!sourceClip) return

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const newStart = Math.max(0, pxToTime(mouseX - offsetX, timelineScale))
    const clipDuration = sourceClip.timelineEnd - sourceClip.timelineStart
    const newEnd = newStart + clipDuration

    if (hasCollision(targetTrackId, newStart, newEnd, clipId)) return

    moveClip(clipId, newStart, targetTrackId)
  }

  const totalWidth = timeToPx(rulerDuration, timelineScale)

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflowX: "auto",
        overflowY: "hidden",
        backgroundColor: "#020617",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Inner container sized to timeline duration */}
      <div style={{ minWidth: totalWidth, position: "relative", display: "flex", flexDirection: "column" }}>

        <PlayheadBar totalWidth={totalWidth} />

        {/* Playhead needle — full-height vertical line spanning ruler + all tracks */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: timeToPx(playhead, timelineScale),
            width: 2,
            height: "100%",
            backgroundColor: "#ef4444",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />

        {/* Tracks */}
        {project.tracks.map(track => (
          <TrackComponent
            key={track.id}
            track={track}
            dragOverTrackId={dragOverTrackId}
            setDragOverTrack={setDragOverTrack}
            onDrop={handleMediaDrop}
            onClipDrop={handleClipDrop}
          />
        ))}
      </div>
    </div>
  )
}
