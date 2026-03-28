import type { DragEvent } from "react"
import { useRef } from "react"
import { useEditorStore } from "../../store/editorStore"
import { useTimeline } from "../../hooks/useTimeline"
import { getProjectDuration, selectGridInterval, timeToPx, pxToTime, TRACK_HEADER_WIDTH } from "../../utils/time"
import { generateId } from "../../utils/id"
import type { Clip, Transform } from "../../project/projectTypes"
import { TrackComponent } from "./Track"
import { PlayheadBar } from "./PlayheadBar"
import { ZOOM_STEP } from "../../constants/timeline"

const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, width: 1280, height: 720, rotation: 0 }

export function Timeline() {
  const project = useEditorStore(s => s.project)
  const playhead = useEditorStore(s => s.playhead)
  const timelineScale = useEditorStore(s => s.timelineScale)
  const setTimelineScale = useEditorStore(s => s.setTimelineScale)
  const addClip = useEditorStore(s => s.addClip)
  const moveClip = useEditorStore(s => s.moveClip)
  const containerRef = useRef<HTMLDivElement>(null)

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (!e.ctrlKey) return
    e.preventDefault()
    const factor = e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP
    setTimelineScale(timelineScale * factor)
  }

  const { xToTime, hasCollision, resolveDropPosition, dragOverTrackId, setDragOverTrack } = useTimeline()

  const duration = getProjectDuration(project.tracks)
  const majorInterval = selectGridInterval(timelineScale)
  const rulerDuration = Math.max(duration + 10, 120)

  function handleMediaDrop(trackId: string, mediaId: string, e: DragEvent<HTMLDivElement>) {
    const track = project.tracks.find(t => t.id === trackId)
    if (!track) return
    const media = project.media.find(m => m.id === mediaId)
    if (!media) return

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const mouseX = e.clientX - rect.left - TRACK_HEADER_WIDTH
    const rawStart = Math.max(0, xToTime(mouseX))
    const clipDuration = media.duration ?? 5
    const timelineStart = resolveDropPosition(trackId, rawStart, clipDuration)
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
    const mouseX = e.clientX - rect.left - TRACK_HEADER_WIDTH
    const rawStart = Math.max(0, pxToTime(mouseX - offsetX, timelineScale))
    const clipDuration = sourceClip.timelineEnd - sourceClip.timelineStart
    const newStart = resolveDropPosition(targetTrackId, rawStart, clipDuration, clipId)
    const newEnd = newStart + clipDuration

    if (hasCollision(targetTrackId, newStart, newEnd, clipId)) return

    moveClip(clipId, newStart, targetTrackId)
  }

  const totalWidth = timeToPx(rulerDuration, timelineScale)
  const majorTickCount = Math.ceil(rulerDuration / majorInterval) + 1
  const majorTickTimes = Array.from({ length: majorTickCount }, (_, i) => i * majorInterval)

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      style={{
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        borderTop: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.05), 0 -4px 16px rgba(0,0,0,0.25)",
      }}
    >
      {/* Scrollable timeline area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-auto relative"
        onWheel={handleWheel}
      >
        <div style={{ minWidth: totalWidth, display: "flex", flexDirection: "column" }}>
          <PlayheadBar totalWidth={totalWidth} duration={rulerDuration} majorInterval={majorInterval} />

          {/* Tracks area */}
          <div style={{ position: "relative", background: "rgba(255,255,255,0.02)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            {/* Major gridlines */}
            <div className="absolute left-0 right-0 pointer-events-none" style={{ top: 0, bottom: 0, zIndex: 1 }}>
              {majorTickTimes.map(t => (
                <div
                  key={t}
                  style={{
                    position: "absolute",
                    left: TRACK_HEADER_WIDTH + timeToPx(t, timelineScale),
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: "var(--color-dark-border)",
                    opacity: 0.3,
                  }}
                />
              ))}
            </div>

            {/* Playhead needle — 1px, full height */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: TRACK_HEADER_WIDTH + timeToPx(playhead, timelineScale),
                width: 1,
                height: "100%",
                background: "var(--color-accent-red)",
                pointerEvents: "none",
                zIndex: 3,
              }}
            />

            {/* Tracks */}
            {[...project.tracks].sort((a, b) => a.order - b.order).map(track => (
              <TrackComponent
                key={track.id}
                track={track}
                dragOverTrackId={dragOverTrackId}
                setDragOverTrack={setDragOverTrack}
                onDrop={handleMediaDrop}
                onClipDrop={handleClipDrop}
                resolveDropPosition={resolveDropPosition}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
