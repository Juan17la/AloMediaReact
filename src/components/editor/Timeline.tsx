import type { DragEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useEditorStore } from "../../store/editorStore"
import { useTimeline } from "../../hooks/useTimeline"
import { getProjectDuration, selectGridInterval, timeToPx, pxToTime, TRACK_HEADER_WIDTH } from "../../utils/time"
import { generateId } from "../../utils/id"
import type { Clip, Transform } from "../../project/projectTypes"
import { TrackComponent } from "./Track"
import { PlayheadBar } from "./PlayheadBar"
import { ZOOM_STEP } from "../../constants/timeline"

const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, width: 1280, height: 720, rotation: 0 }

// Reusable glass panel constant

export function Timeline() {
  const project = useEditorStore(s => s.project)
  const playhead = useEditorStore(s => s.playhead)
  const timelineScale = useEditorStore(s => s.timelineScale)
  const setTimelineScale = useEditorStore(s => s.setTimelineScale)
  const addClip = useEditorStore(s => s.addClip)
  const moveClip = useEditorStore(s => s.moveClip)
  const moveClipsBatch = useEditorStore(s => s.moveClipsBatch)
  const setSelectedClips = useEditorStore(s => s.setSelectedClips)
  const clearClipSelection = useEditorStore(s => s.clearClipSelection)
  const containerRef = useRef<HTMLDivElement>(null)
  const tracksAreaRef = useRef<HTMLDivElement>(null)
  const [marquee, setMarquee] = useState<{
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)

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
    const dragSelectionRaw = e.dataTransfer.getData("clipDragSelection")

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

    const dragSelection = (() => {
      if (!dragSelectionRaw) return [] as Array<{ clipId: string; timelineStart: number; trackId: string }>
      try {
        return JSON.parse(dragSelectionRaw) as Array<{ clipId: string; timelineStart: number; trackId: string }>
      } catch {
        return []
      }
    })()

    if (dragSelection.length <= 1) {
      if (hasCollision(targetTrackId, newStart, newEnd, clipId)) return
      moveClip(clipId, newStart, targetTrackId)
      return
    }

    const anchor = dragSelection.find(item => item.clipId === clipId)
    if (!anchor) {
      if (hasCollision(targetTrackId, newStart, newEnd, clipId)) return
      moveClip(clipId, newStart, targetTrackId)
      return
    }

    let delta = newStart - anchor.timelineStart
    const minStart = Math.min(...dragSelection.map(item => item.timelineStart))
    if (minStart + delta < 0) {
      delta = -minStart
    }

    const movingIds = new Set(dragSelection.map(item => item.clipId))
    const clipById = new Map(project.tracks.flatMap(track => track.clips.map(clip => [clip.id, clip] as const)))

    const proposed = dragSelection
      .map(item => {
        const clip = clipById.get(item.clipId)
        if (!clip) return null
        return {
          clipId: item.clipId,
          trackId: clip.trackId,
          newStart: Math.max(0, item.timelineStart + delta),
          duration: clip.timelineEnd - clip.timelineStart,
        }
      })
      .filter((item): item is { clipId: string; trackId: string; newStart: number; duration: number } => !!item)

    const hasGroupCollision = proposed.some(move => {
      const track = project.tracks.find(t => t.id === move.trackId)
      if (!track) return false
      const newEndTime = move.newStart + move.duration
      return track.clips.some(clip => {
        if (movingIds.has(clip.id)) return false
        return move.newStart < clip.timelineEnd && newEndTime > clip.timelineStart
      })
    })

    if (hasGroupCollision) return

    moveClipsBatch(proposed.map(({ clipId: id, trackId, newStart: nextStart }) => ({ clipId: id, trackId, newStart: nextStart })))
  }

  const sortedTracks = useMemo(
    () => [...project.tracks].sort((a, b) => a.order - b.order),
    [project.tracks],
  )

  useEffect(() => {
    if (!marquee) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMarquee(null)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [marquee])

  useEffect(() => {
    const clearMarquee = () => setMarquee(null)
    window.addEventListener("dragend", clearMarquee)
    window.addEventListener("drop", clearMarquee)
    return () => {
      window.removeEventListener("dragend", clearMarquee)
      window.removeEventListener("drop", clearMarquee)
    }
  }, [])

  function handleTracksMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest("[data-clip-id]")) return
    if (target.closest("[data-track-header='true']")) return

    const rect = tracksAreaRef.current?.getBoundingClientRect()
    if (!rect) return
    const startX = e.clientX - rect.left
    const startY = e.clientY - rect.top
    setMarquee({ startX, startY, currentX: startX, currentY: startY })

    const onMove = (ev: MouseEvent) => {
      const nextX = ev.clientX - rect.left
      const nextY = ev.clientY - rect.top
      setMarquee(curr => (curr ? { ...curr, currentX: nextX, currentY: nextY } : null))
    }

    const onUp = () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      setMarquee(curr => {
        if (!curr) return null
        const x1 = Math.min(curr.startX, curr.currentX)
        const x2 = Math.max(curr.startX, curr.currentX)
        const y1 = Math.min(curr.startY, curr.currentY)
        const y2 = Math.max(curr.startY, curr.currentY)

        const selected: string[] = []
        let yOffset = 0
        for (const track of sortedTracks) {
          const rowHeight = track.type === "video" ? 55 : 50
          for (const clip of track.clips) {
            const cx1 = TRACK_HEADER_WIDTH + timeToPx(clip.timelineStart, timelineScale)
            const cx2 = cx1 + Math.max(timeToPx(clip.timelineEnd - clip.timelineStart, timelineScale), 4)
            const cy1 = yOffset
            const cy2 = yOffset + rowHeight
            const intersects = cx1 < x2 && cx2 > x1 && cy1 < y2 && cy2 > y1
            if (intersects) selected.push(clip.id)
          }
          yOffset += rowHeight
        }

        if (selected.length === 0) {
          clearClipSelection()
        } else {
          setSelectedClips(selected)
        }

        return null
      })
    }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }

  const totalWidth = timeToPx(rulerDuration, timelineScale)
  const majorTickCount = Math.ceil(rulerDuration / majorInterval) + 1
  const majorTickTimes = Array.from({ length: majorTickCount }, (_, i) => i * majorInterval)

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden border-t border-t-white/15 shadow-[inset_0_-1px_0_rgba(255,255,255,0.05),0_-4px_16px_rgba(0,0,0,0.25)] backdrop-blur-2xl"
    >
      {/* Scrollable timeline area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-auto relative"
        onWheel={handleWheel}
      >
        <div className="flex flex-col" style={{ minWidth: totalWidth }}>
          <PlayheadBar totalWidth={totalWidth} duration={rulerDuration} majorInterval={majorInterval} />

          {/* Tracks area */}
            <div
              ref={tracksAreaRef}
              onMouseDown={handleTracksMouseDown}
            className="relative bg-white/2 border-t border-t-white/7 backdrop-blur-4xl"
          >
            {/* Major gridlines */}
            <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none z-1">
              {majorTickTimes.map(t => (
                <div
                  key={t}
                  className="absolute top-0 bottom-0 w-px bg-dark-border opacity-30"
                  style={{ left: TRACK_HEADER_WIDTH + timeToPx(t, timelineScale) }}
                />
              ))}
            </div>

            {/* Playhead needle — 1px, full height */}
            <div
              className="absolute top-0 w-px h-full bg-accent-red pointer-events-none z-3"
              style={{ left: TRACK_HEADER_WIDTH + timeToPx(playhead, timelineScale) }}
            />

            {/* Tracks */}
            {sortedTracks.map(track => (
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

            {marquee && (
              <div
                className="absolute z-20 border-2 border-accent-red/70 bg-accent-red/15 pointer-events-none"
                style={{
                  left: Math.min(marquee.startX, marquee.currentX),
                  top: Math.min(marquee.startY, marquee.currentY),
                  width: Math.abs(marquee.currentX - marquee.startX),
                  height: Math.abs(marquee.currentY - marquee.startY),
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
