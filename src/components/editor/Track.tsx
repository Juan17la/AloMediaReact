import { useEffect, useMemo, useState, type DragEvent } from "react"
import { Eye, EyeOff, Trash2, Film, Music } from "lucide-react"
import type { MediaType, Track, TrackType } from "../../project/projectTypes"
import { ClipComponent } from "./Clip"
import { useEditorStore } from "../../store/editorStore"
import { pxToTime, timeToPx, TRACK_HEADER_WIDTH } from "../../utils/time"
import { supportsOutgoingTransition } from "../../utils/transitions"
import { TransitionBadge } from "./TransitionBadge"
import { buildClipTransitionView, getCanonicalTransitionEdges } from "../../project/transitionEdges"

interface TrackProps {
  track: Track
  dragOverTrackId: string | undefined
  setDragOverTrack: (id: string | undefined) => void
  onDrop: (trackId: string, mediaId: string, e: DragEvent<HTMLDivElement>) => void
  onClipDrop: (e: DragEvent<HTMLDivElement>, targetTrackId: string) => void
  resolveDropPosition: (trackId: string, rawStart: number, clipDuration: number, excludeClipId?: string) => number
}

const TYPE_LABEL: Record<string, string> = { video: "Video", audio: "Audio" }

// Icon button constant
// const iconBtn =
//   "p-1.5 rounded-md bg-transparent text-white/55 hover:bg-white/7 hover:text-white/90 active:text-[var(--color-accent-red)] active:scale-95 transition-all duration-100"

// Track action button constant
const trackControlBtn =
  "flex items-center justify-center w-5 h-5 shrink-0 rounded-md border-0 bg-transparent p-0 cursor-pointer transition-[opacity,color] duration-[120ms]"

const trackControlBtnActive =
  "text-accent-red"

const trackControlBtnNormal =
  "text-white/35 hover:text-white/75"

const trackControlBtnDanger =
  "text-white/35 hover:text-red-400"

const trackControlBtnHidden =
  "opacity-0 group-hover:opacity-100"

function TrackControlBtn({
  icon,
  label,
  onClick,
  active = false,
  danger = false,
  hidden = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: (e: React.MouseEvent) => void
  active?: boolean
  danger?: boolean
  hidden?: boolean
}) {
  const btnClass = [
    trackControlBtn,
    active
      ? trackControlBtnActive
      : danger
        ? trackControlBtnDanger
        : trackControlBtnNormal,
    hidden ? trackControlBtnHidden : "",
  ].filter(Boolean).join(" ")

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={btnClass}
    >
      <span className="flex items-center w-2.75 h-2.75">
        {icon}
      </span>
    </button>
  )
}

export function TrackComponent({ track, dragOverTrackId, setDragOverTrack, onDrop, onClipDrop, resolveDropPosition }: TrackProps) {
  const selectedClipId = useEditorStore(s => s.selectedClipId)
  const selectedClipIds = useEditorStore(s => s.selectedClipIds)
  const selectedTransitionClipId = useEditorStore(s => s.selectedTransitionClipId)
  const setSelectedClip = useEditorStore(s => s.setSelectedClip)
  const toggleClipSelection = useEditorStore(s => s.toggleClipSelection)
  const setSelectedTransitionClip = useEditorStore(s => s.setSelectedTransitionClip)
  const scale = useEditorStore(s => s.timelineScale)
  const removeTrack = useEditorStore(s => s.removeTrack)
  const reorderTrack = useEditorStore(s => s.reorderTrack)
  const allTracks = useEditorStore(s => s.project.tracks)
  const projectMedia = useEditorStore(s => s.project.media)
  const project = useEditorStore(s => s.project)

  const sameTypeTracks = allTracks.filter(t => t.type === track.type)
  const trackIndex = sameTypeTracks.findIndex(t => t.id === track.id)
  const baseLabel = TYPE_LABEL[track.type] ?? track.type
  const trackLabel = sameTypeTracks.length > 1 ? `${baseLabel} ${trackIndex + 1}` : baseLabel
  const canRemove = sameTypeTracks.length > 1

  const [snapIndicatorX, setSnapIndicatorX] = useState<number | null>(null)
  const [reorderOver, setReorderOver] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  const isOver = dragOverTrackId === track.id
  const rowHeight = track.type === "video" ? 55 : 50

  const transitionBadges = useMemo(() => {
    const edges = getCanonicalTransitionEdges(project)
      .filter(edge => edge.trackId === track.id)

    return edges.flatMap(edge => {
      const badges: Array<{
        key: string
        clipId: string
        transition: { type: string; duration: number }
        left: number
        position: "in" | "out"
      }> = []

      if (edge.clipAId) {
        badges.push({
          key: `out-${edge.edgeId}`,
          clipId: edge.clipAId,
          transition: { type: edge.transitionTypeCanonical, duration: edge.durationS },
          left: timeToPx(edge.boundaryTimeS, scale),
          position: "out",
        })
      }

      if (edge.clipBId) {
        badges.push({
          key: `in-${edge.edgeId}`,
          clipId: edge.clipBId,
          transition: { type: edge.transitionTypeCanonical, duration: edge.durationS },
          left: timeToPx(edge.boundaryTimeS, scale),
          position: "in",
        })
      }

      return badges
    })
  }, [project, scale, track.id])

  useEffect(() => {
    if (!selectedTransitionClipId) return

    const selected = track.clips.find(c => c.id === selectedTransitionClipId)
    if (!selected) return

    if (!supportsOutgoingTransition(selected)) {
      setSelectedTransitionClip(undefined)
      return
    }
    const transitionView = buildClipTransitionView(project).get(selected.id)
    const hasOut = !!(transitionView?.transitionOut && transitionView.transitionOut.duration > 0)
    const hasIn = !!(transitionView?.transitionIn && transitionView.transitionIn.duration > 0)
    if (!hasOut && !hasIn) {
      setSelectedTransitionClip(undefined)
    }
  }, [project, selectedTransitionClipId, setSelectedTransitionClip, track.clips])

  function isCompatibleDrop(mediaType: MediaType, trackType: TrackType): boolean {
    if (mediaType === "subtitles") return false
    if (mediaType === "audio") return trackType === "audio"
    return trackType === "video"
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    if (e.dataTransfer.types.includes('reordertrackid')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setReorderOver(true)
      return
    }
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const cursorTime = pxToTime(e.clientX - rect.left - TRACK_HEADER_WIDTH, scale)
    const resolved = resolveDropPosition(track.id, cursorTime, 0)
    setSnapIndicatorX(timeToPx(resolved, scale))
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (e.dataTransfer.types.includes('reordertrackid')) return
    setDragOverTrack(track.id)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTrack(undefined)
      setSnapIndicatorX(null)
      setReorderOver(false)
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setReorderOver(false)

    const sourceId = e.dataTransfer.getData('reorderTrackId')
    if (sourceId && sourceId !== track.id) {
      reorderTrack(sourceId, track.id)
      return
    }

    setDragOverTrack(undefined)
    setSnapIndicatorX(null)
    const mediaId = e.dataTransfer.getData("mediaId")
    const clipId = e.dataTransfer.getData("clipId")
    if (mediaId) {
      const media = projectMedia.find(m => m.id === mediaId)
      if (media && !isCompatibleDrop(media.type, track.type)) return
      onDrop(track.id, mediaId, e)
    } else if (clipId) {
      onClipDrop(e, track.id)
    }
  }

  function handleClipDragStart(e: DragEvent<HTMLDivElement>, clipId: string) {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    e.dataTransfer.setData("clipId", clipId)
    e.dataTransfer.setData("clipOffsetX", String(offsetX))

    const dragSelection = selectedClipIds.includes(clipId)
      ? selectedClipIds
      : [clipId]
    const dragMembers = allTracks.flatMap(t =>
      t.clips
        .filter(c => dragSelection.includes(c.id))
        .map(c => ({ clipId: c.id, timelineStart: c.timelineStart, trackId: c.trackId })),
    )
    e.dataTransfer.setData("clipDragSelection", JSON.stringify(dragMembers))
  }

  function handleClipSelect(clipId: string, options?: { toggle?: boolean }) {
    if (options?.toggle) {
      toggleClipSelection(clipId)
      return
    }
    setSelectedClip(clipId)
  }

  const TypeIcon = track.type === "video" ? Film : Music

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        "flex min-w-full box-border overflow-hidden border-b border-b-white/5 timeline-track-row",
        isOver ? "bg-white/6" : "odd:bg-white/2 even:bg-black/12",
        reorderOver ? "border-t-2 border-t-accent-red" : "",
      ].filter(Boolean).join(" ")}
      style={{ height: rowHeight }}
    >
      {/* Track header — sticky left */}
      <div
        className="group sticky left-0 z-4 h-full shrink-0 flex items-center justify-between pr-1.5 box-border gap-1 border-r border-r-white/8 bg-white/5"
        style={{ width: TRACK_HEADER_WIDTH }}
      >
        {/* Grip handle — dotted texture on far left */}
        <div
          draggable
          onDragStart={e => {
            e.dataTransfer.setData('reorderTrackId', track.id)
            e.dataTransfer.effectAllowed = 'move'
          }}
          className="w-3.5 h-full shrink-0 cursor-grab select-none"
          style={{
            background: "repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, var(--color-dark-border-light) 2px, var(--color-dark-border-light) 3px)",
          }}
        />

        {/* Type icon + label */}
        <div className="flex w-full items-center justify-center gap-1 flex-1 min-w-0">
          <TypeIcon size={11} className="text-muted shrink-0" />
          <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-white/50 overflow-hidden text-ellipsis whitespace-nowrap">
            {trackLabel}
          </span>
        </div>

        {/* Track action buttons */}
        <div className="flex items-center gap-px shrink-0">
          <TrackControlBtn
            icon={isVisible ? <Eye size={11} /> : <EyeOff size={11} />}
            label={isVisible ? "Hide track" : "Show track"}
            active={!isVisible}
            onClick={() => setIsVisible(v => !v)}
          />
          {/* <TrackControlBtn
            icon={isLocked ? <Lock size={11} /> : <Unlock size={11} />}
            label={isLocked ? "Unlock track" : "Lock track"}
            active={isLocked}
            onClick={() => setIsLocked(v => !v)}
          /> */}
          {canRemove && (
            <TrackControlBtn
              icon={<Trash2 size={11} />}
              label="Delete track"
              danger
              onClick={e => { e.stopPropagation(); removeTrack(track.id) }}
            />
          )}
        </div>
      </div>

      {/* Clips area */}
      <div className="relative flex-1 overflow-hidden h-full">
        {transitionBadges.map(badge => (
          <TransitionBadge
            key={badge.key}
            clipId={badge.clipId}
            transition={badge.transition}
            left={badge.left}
            position={badge.position}
            isSelected={selectedTransitionClipId === badge.clipId}
            onSelect={setSelectedTransitionClip}
          />
        ))}

        {/* Snap indicator */}
        {snapIndicatorX !== null && (
          <div
            className="absolute top-0 w-0.5 h-full bg-warning pointer-events-none z-5"
            style={{ left: snapIndicatorX }}
          />
        )}

        {track.clips.map(clip => (
          <ClipComponent
            key={clip.id}
            clip={clip}
            scale={scale}
            isSelected={selectedClipIds.includes(clip.id) || selectedClipId === clip.id}
            onSelect={handleClipSelect}
            onDragStart={handleClipDragStart}
            onDragEnd={() => setSnapIndicatorX(null)}
          />
        ))}
      </div>
    </div>
  )
}
