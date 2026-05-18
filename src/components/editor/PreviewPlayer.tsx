import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { SkipBack, Rewind, Play, Pause, FastForward, SkipForward, Volume2, VolumeX } from "lucide-react"
import type { VideoClip, ImageClip, TextClip, Transform } from "../../project/projectTypes"
import { useEditorStore } from "../../store/editorStore"
import { usePlayer } from "../../hooks/usePlayer"
import { getProjectDuration, CLIP_EPSILON } from "../../utils/time"
import { useMediaSync } from "../../player/hooks/useMediaSync"
import { applyTransform } from "../../player/render/transformUtils"
import { buildCssFilter } from "../../utils/colorAdjustmentFilters"
import { DEFAULT_COLOR_ADJUSTMENTS } from "../../constants/colorAdjustments"
import { DEFAULT_TEXT_STYLE } from "../../constants/textStyle"
import { setupCanvasScaling } from "../../player/render/canvasScaling"
import { TransformOverlay } from "./TransformOverlay"
import { RangeSlider } from "../ui/RangeSlider"
import { getActiveVideoClip } from "../../player/timeline/activeClipResolver"
import { DEFAULT_SPEED } from "../../constants/speed"
import { compileUnifiedTransitions } from "../../engine/transitionCompiler"

// Toggle this to enable/disable the transition debug overlay
const transitionDebug = false

// ======================================================
// REMOVE: This is a playground for testing out the preview player and related features. It's not currently used in the app, but it can be useful for development and experimentation.
// ======================================================

interface ActiveTransitionDebugView {
  transitionId: string
  sourceA: string
  sourceB: string
  startTimeS: number
  endTimeS: number
  boundaryTimeS: number
  canonicalType: string
  progress: number
}

interface RectLike {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

function getGroupBounds(transforms: Transform[]): Transform {
  const minX = Math.min(...transforms.map(t => t.x))
  const minY = Math.min(...transforms.map(t => t.y))
  const maxX = Math.max(...transforms.map(t => t.x + t.width))
  const maxY = Math.max(...transforms.map(t => t.y + t.height))
  const avgRotation = transforms.reduce((sum, t) => sum + (t.rotation ?? 0), 0) / transforms.length
  return {
    x: minX,
    y: minY,
    width: Math.max(20, maxX - minX),
    height: Math.max(20, maxY - minY),
    rotation: avgRotation,
  }
}

function applyGroupTransformToChild(current: RectLike, currentGroup: RectLike, nextGroup: RectLike): Transform {
  const currentCenterX = current.x + current.width / 2
  const currentCenterY = current.y + current.height / 2
  const currentGroupCenterX = currentGroup.x + currentGroup.width / 2
  const currentGroupCenterY = currentGroup.y + currentGroup.height / 2
  const nextGroupCenterX = nextGroup.x + nextGroup.width / 2
  const nextGroupCenterY = nextGroup.y + nextGroup.height / 2

  const scaleX = currentGroup.width === 0 ? 1 : nextGroup.width / currentGroup.width
  const scaleY = currentGroup.height === 0 ? 1 : nextGroup.height / currentGroup.height
  const deltaRotationDeg = (nextGroup.rotation ?? 0) - (currentGroup.rotation ?? 0)
  const deltaRotationRad = (deltaRotationDeg * Math.PI) / 180

  const dx = (currentCenterX - currentGroupCenterX) * scaleX
  const dy = (currentCenterY - currentGroupCenterY) * scaleY
  const rotatedDx = dx * Math.cos(deltaRotationRad) - dy * Math.sin(deltaRotationRad)
  const rotatedDy = dx * Math.sin(deltaRotationRad) + dy * Math.cos(deltaRotationRad)

  const nextWidth = Math.max(20, current.width * scaleX)
  const nextHeight = Math.max(20, current.height * scaleY)
  const nextCenterX = nextGroupCenterX + rotatedDx
  const nextCenterY = nextGroupCenterY + rotatedDy

  return {
    x: nextCenterX - nextWidth / 2,
    y: nextCenterY - nextHeight / 2,
    width: nextWidth,
    height: nextHeight,
    rotation: (current.rotation ?? 0) + deltaRotationDeg,
  }
}

// ===============================================

function formatTimecode(seconds: number): string {
  seconds = Math.max(0, isFinite(seconds) ? seconds : 0)
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const f = Math.floor((seconds % 1) * 30) // 30fps approximation
  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0"),
    String(f).padStart(2, "0"),
  ].join(":")
}

function TransportBtn({
  icon,
  label,
  onClick,
  primary = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  primary?: boolean
}) {
  const btnClass = primary
    ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary-foreground/30 bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-[0.95] active:scale-95 transition-all duration-100 cursor-pointer"
    : "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high hover:border-primary/40 hover:text-primary transition-all duration-150"

  const spanClass = primary
    ? "flex items-center w-4 h-4"
    : "flex items-center w-3.5 h-3.5"

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={btnClass}
    >
      <span className={spanClass}>
        {icon}
      </span>
    </button>
  )
}

export function PreviewPlayer() {
  const project = useEditorStore(s => s.project)
  const playhead = useEditorStore(s => s.playhead)
  const isPlaying = useEditorStore(s => s.isPlaying)
  const selectedClipId = useEditorStore(s => s.selectedClipId)
  const selectedClipIds = useEditorStore(s => s.selectedClipIds)
  const groupEditGroupId = useEditorStore(s => s.groupEditGroupId)
  const updateClipTransform = useEditorStore(s => s.updateClipTransform)
  const updateClipTransformsBatch = useEditorStore(s => s.updateClipTransformsBatch)
  const commitTransform = useEditorStore(s => s.commitTransform)
  const commitTransformsBatch = useEditorStore(s => s.commitTransformsBatch)
  const setSelectedClip = useEditorStore(s => s.setSelectedClip)
  const toggleClipSelection = useEditorStore(s => s.toggleClipSelection)
  const setSelectedClips = useEditorStore(s => s.setSelectedClips)
  const clearClipSelection = useEditorStore(s => s.clearClipSelection)
  const enterGroupEditMode = useEditorStore(s => s.enterGroupEditMode)
  const updateTextClip = useEditorStore(s => s.updateTextClip)
  const pushHistory = useEditorStore(s => s.pushHistory)
  const { play, pause, seek, onFrameRef, playheadRef, seekFlagResetRef } = usePlayer()
  const tracks = project.tracks
  const duration = getProjectDuration(tracks)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const innerCanvasRef = useRef<HTMLDivElement>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [editingTextClipId, setEditingTextClipId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [editingOriginalContent, setEditingOriginalContent] = useState("")
  const editingDoneRef = useRef(false)
  // Stable ref callback: only focus+select when a new edit session starts (editingTextClipId changes).
  // An inline arrow ref would be a new function every render, causing el.select() to fire on every
  // store-triggered re-render and replacing typed text with the next keystroke.
  const editTextareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (el) { el.focus(); el.select() }
  }, [editingTextClipId])
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const marqueeRef = useRef(marquee)
  marqueeRef.current = marquee
  const marqueeJustCompletedRef = useRef(false)

  const secondaryVideoElemsRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  const secondaryClipsRef = useRef<VideoClip[]>([])

  useEffect(() => {
    const container = canvasContainerRef.current
    const inner = innerCanvasRef.current
    if (!container || !inner) return
    return setupCanvasScaling(container, inner)
  }, [])

  const { videoRefA, videoRefB, getObjectUrl, getPlaybackUrl } = useMediaSync({
    onFrameRef,
    seekFlagResetRef,
    playheadRef,
    isMuted,
    volume,
    secondaryVideoElemsRef,
    secondaryClipsRef,
  })

  const sortedTracks = useMemo(
    () => [...project.tracks].sort((a, b) => a.order - b.order),
    [project.tracks],
  )

  const activeClips = useMemo(() => {
    return sortedTracks.flatMap(track => {
      const candidates = track.clips.filter(
        clip =>
          clip.timelineStart - CLIP_EPSILON <= playhead &&
          playhead < clip.timelineEnd + CLIP_EPSILON,
      )
      if (candidates.length <= 1) return candidates
      const maxStart = Math.max(...candidates.map(c => c.timelineStart))
      return candidates.filter(c => c.timelineStart === maxStart)
    })
  }, [sortedTracks, playhead])

  const staticElements = useMemo(
    () => activeClips.filter(c => c.type === "image" || c.type === "text"),
    [activeClips],
  )

  const selectedIdSet = useMemo(() => {
    const ids = new Set(selectedClipIds)
    if (selectedClipId) ids.add(selectedClipId)
    return ids
  }, [selectedClipId, selectedClipIds])

  const selectedCanvasClips = useMemo(
    () => activeClips.filter((clip): clip is VideoClip | ImageClip | TextClip => clip.type !== "audio" && selectedIdSet.has(clip.id)),
    [activeClips, selectedIdSet],
  )

  const selectedCanvasTransforms = useMemo(
    () => selectedCanvasClips.map(clip => ({ clipId: clip.id, transform: clip.transform })),
    [selectedCanvasClips],
  )

  const groupTransform = useMemo(() => {
    if (selectedCanvasTransforms.length < 2) return null
    return getGroupBounds(selectedCanvasTransforms.map(entry => entry.transform))
  }, [selectedCanvasTransforms])

  const selectedGroupId = useMemo(() => {
    if (!selectedClipId) return undefined
    return (project.clipGroups ?? []).find(group => group.memberClipIds.includes(selectedClipId))?.id
  }, [project.clipGroups, selectedClipId])

  const trackLayerIndexMap = useMemo(
    () => new Map(sortedTracks.map((t, index) => [t.id, index])),
    [sortedTracks],
  )
  const zIndex = (trackId: string) => {
    const layerIndex = trackLayerIndexMap.get(trackId)
    if (layerIndex === undefined) return 1
    // First track in timeline order should be visually on top.
    return sortedTracks.length - layerIndex
  }

  const primaryVideoClip = useMemo(
    () => getActiveVideoClip(project.tracks, playhead),
    [project.tracks, playhead],
  )

  const secondaryVideoClips = useMemo(() => {
    const primaryId = primaryVideoClip?.id
    return activeClips.filter(
      (c): c is VideoClip => c.type === "video" && c.id !== primaryId,
    )
  }, [activeClips, primaryVideoClip])


  // ======================================================
  // REMOVE: This is a playground for testing out the preview player and related features. It's not currently used in the app, but it can be useful for development and experimentation.
  // ======================================================

  const activeTransitionDebug = useMemo<ActiveTransitionDebugView | null>(() => {
    if (!transitionDebug) return null
    const compiled = compileUnifiedTransitions(project)
    const active = compiled.transitions
      .filter(transition => playhead >= transition.startTimeS - CLIP_EPSILON && playhead <= transition.endTimeS + CLIP_EPSILON)
      .sort((a, b) => {
        const boundaryDiff = a.boundaryTimeS - b.boundaryTimeS
        if (Math.abs(boundaryDiff) > CLIP_EPSILON) return boundaryDiff
        return a.transitionId.localeCompare(b.transitionId)
      })[0]

    if (!active) return null

    const rawProgress = active.durationS <= CLIP_EPSILON
      ? 1
      : (playhead - active.startTimeS) / active.durationS
    const progress = Math.max(0, Math.min(1, rawProgress))

    return {
      transitionId: active.transitionId,
      sourceA: active.clipARef.clipId ?? active.clipARef.synthetic?.kind ?? "none",
      sourceB: active.clipBRef.clipId ?? active.clipBRef.synthetic?.kind ?? "none",
      startTimeS: active.startTimeS,
      endTimeS: active.endTimeS,
      boundaryTimeS: active.boundaryTimeS,
      canonicalType: active.typeCanonical,
      progress,
    }
  }, [project, playhead])

  // =======================================================

  // Keep a ref copy of secondary clips but do the assignment in an effect
  // to avoid updating refs during render (eslint: react-hooks/refs).
  useEffect(() => {
    secondaryClipsRef.current = secondaryVideoClips
  }, [secondaryVideoClips])

  // Measure preview container size and provide width/height to children
  const [previewSize, setPreviewSize] = useState({ width: 640, height: 360 })
  useEffect(() => {
    const container = canvasContainerRef.current
    if (!container) return

    function update() {
      const c = canvasContainerRef.current
      if (!c) return
      setPreviewSize({ width: c.clientWidth || 640, height: c.clientHeight || 360 })
    }

    update()
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update)
      return () => window.removeEventListener("resize", update)
    }
    const ro = new ResizeObserver(() => update())
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Ensure playbackRate is set from clip data in an effect, not during render
  useEffect(() => {
    for (const clip of secondaryVideoClips) {
      const el = secondaryVideoElemsRef.current.get(clip.id)
      if (el) el.playbackRate = clip.speed ?? DEFAULT_SPEED
    }
  }, [secondaryVideoClips])

  function commitTextEdit() {
    if (editingDoneRef.current) return
    editingDoneRef.current = true
    pushHistory("Edit text content")
    setEditingTextClipId(null)
  }

  function cancelTextEdit() {
    if (editingDoneRef.current || !editingTextClipId) return
    editingDoneRef.current = true
    updateTextClip(editingTextClipId, { content: editingOriginalContent })
    setEditingTextClipId(null)
  }

  function handleCanvasDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = canvasContainerRef.current!.getBoundingClientRect()
    const canvasX = (e.clientX - rect.left) / (rect.width / 1280)
    const canvasY = (e.clientY - rect.top) / (rect.height / 720)

    const hit = [...activeClips].reverse().find(clip => {
      if (clip.type !== "text") return false
      const t = clip.transform
      return canvasX >= t.x && canvasX <= t.x + t.width
        && canvasY >= t.y && canvasY <= t.y + t.height
    }) as TextClip | undefined

    if (hit && selectedGroupId && groupEditGroupId !== selectedGroupId) {
      const group = project.clipGroups?.find(g => g.id === selectedGroupId)
      const isTextOnlyGroup = group && group.memberClipIds.every(id => {
        for (const track of project.tracks) {
          const c = track.clips.find(c => c.id === id)
          if (c) return c.type === "text"
        }
        return false
      })

      if (isTextOnlyGroup) {
        // For text-only groups, double-click goes directly to individual editing
        enterGroupEditMode(selectedGroupId)
        setSelectedClip(hit.id)
        editingDoneRef.current = false
        setEditingTextClipId(hit.id)
        setEditingContent(hit.content)
        setEditingOriginalContent(hit.content)
        pause()
        return
      }

      enterGroupEditMode(selectedGroupId)
      return
    }

    if (hit) {
      editingDoneRef.current = false
      setEditingTextClipId(hit.id)
      setEditingContent(hit.content)
      setEditingOriginalContent(hit.content)
      setSelectedClip(hit.id)
      pause()
    }
  }

  useEffect(() => {
    if (!marquee) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMarquee(null)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [marquee])

  function toCanvasCoordinates(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvasContainerRef.current!.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / (rect.width / 1280),
      y: (clientY - rect.top) / (rect.height / 720),
    }
  }

  function handleCanvasMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    marqueeJustCompletedRef.current = false
    const toggle = e.ctrlKey || e.metaKey
    const { x: canvasX, y: canvasY } = toCanvasCoordinates(e.clientX, e.clientY)

    const hit = [...activeClips].reverse().find(clip => {
      if (clip.type === "audio") return false
      const t = clip.transform
      return canvasX >= t.x && canvasX <= t.x + t.width
        && canvasY >= t.y && canvasY <= t.y + t.height
    })

    if (hit) {
      if (toggle) toggleClipSelection(hit.id)
      else setSelectedClip(hit.id)
      return
    }

    const start = { x1: canvasX, y1: canvasY, x2: canvasX, y2: canvasY }
    setMarquee(start)

    const onMove = (ev: MouseEvent) => {
      const next = toCanvasCoordinates(ev.clientX, ev.clientY)
      setMarquee(curr => {
        const updated = curr ? { ...curr, x2: next.x, y2: next.y } : null
        marqueeRef.current = updated
        return updated
      })
    }

    const onUp = () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      marqueeJustCompletedRef.current = true
      const curr = marqueeRef.current
      setMarquee(null)
      marqueeRef.current = null

      if (!curr) {
        clearClipSelection()
        return
      }
      const x1 = Math.min(curr.x1, curr.x2)
      const x2 = Math.max(curr.x1, curr.x2)
      const y1 = Math.min(curr.y1, curr.y2)
      const y2 = Math.max(curr.y1, curr.y2)
      const selected = activeClips
        .filter((clip): clip is VideoClip | ImageClip | TextClip => clip.type !== "audio")
        .filter(clip => {
          const t = clip.transform
          const cx1 = t.x
          const cx2 = t.x + t.width
          const cy1 = t.y
          const cy2 = t.y + t.height
          return cx1 < x2 && cx2 > x1 && cy1 < y2 && cy2 > y1
        })
        .map(clip => clip.id)

      if (selected.length === 0) clearClipSelection()
      else setSelectedClips(selected)
    }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (marquee) return
    if (marqueeJustCompletedRef.current) {
      marqueeJustCompletedRef.current = false
      return
    }
    const rect = canvasContainerRef.current!.getBoundingClientRect()
    const canvasX = (e.clientX - rect.left) / (rect.width / 1280)
    const canvasY = (e.clientY - rect.top) / (rect.height / 720)

    const hit = [...activeClips].reverse().find(clip => {
      if (clip.type === "audio") return false
      const t = clip.transform
      return canvasX >= t.x && canvasX <= t.x + t.width
        && canvasY >= t.y && canvasY <= t.y + t.height
    })
    setSelectedClip(hit ? hit.id : undefined)
  }

  function handleGroupTransformUpdate(next: Partial<Transform>) {
    if (!groupTransform || selectedCanvasTransforms.length < 2) return
    const nextGroup = { ...groupTransform, ...next }
    const updates = selectedCanvasTransforms.map(entry => ({
      clipId: entry.clipId,
      transform: applyGroupTransformToChild(entry.transform, groupTransform, nextGroup),
    }))
    updateClipTransformsBatch(updates)
  }

  return (
    <div className="flex flex-col min-h-0 h-full w-full items-center justify-center">
      {/* Canvas area */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden my-2">
        <div
          ref={canvasContainerRef}
          onMouseDown={handleCanvasMouseDown}
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDoubleClick}
          className="relative bg-background overflow-hidden cursor-default aspect-video h-full max-w-full w-auto border-2 border-outline/15"
        >
          <div
            ref={innerCanvasRef}
            className="absolute origin-top-left bg-black"
            style={{
              width: 1280,
              height: 720,
              pointerEvents: selectedClipId ? "none" : undefined,
            }}
          >
            <video
              ref={videoRefA}
              style={{ position: "absolute", opacity: 1, pointerEvents: "none", willChange: "transform", transform: "translateZ(0)", zIndex: primaryVideoClip ? zIndex(primaryVideoClip.trackId) : 0, filter: primaryVideoClip ? buildCssFilter(primaryVideoClip.colorAdjustments ?? DEFAULT_COLOR_ADJUSTMENTS) : undefined }}
              preload="auto" playsInline disablePictureInPicture
            />
            <video
              ref={videoRefB}
              style={{ position: "absolute", opacity: 0, pointerEvents: "none", willChange: "transform", transform: "translateZ(0)", zIndex: primaryVideoClip ? zIndex(primaryVideoClip.trackId) : 0, filter: primaryVideoClip ? buildCssFilter(primaryVideoClip.colorAdjustments ?? DEFAULT_COLOR_ADJUSTMENTS) : undefined }}
              preload="auto" playsInline disablePictureInPicture
            />

            {secondaryVideoClips.map(clip => (
              <video
                key={clip.id}
                ref={el => {
                  if (el) secondaryVideoElemsRef.current.set(clip.id, el)
                  else secondaryVideoElemsRef.current.delete(clip.id)
                }}
                src={getPlaybackUrl(clip.mediaId)}
                style={{ ...applyTransform(clip.transform), filter: buildCssFilter(clip.colorAdjustments ?? DEFAULT_COLOR_ADJUSTMENTS), zIndex: zIndex(clip.trackId), pointerEvents: "none", outline: selectedIdSet.has(clip.id) ? "2px solid var(--color-error)" : undefined }}
                muted
                preload="auto"
                playsInline
                disablePictureInPicture
              />
            ))}

            {staticElements.map(clip => {
              if (clip.type === "image") {
                return <img key={clip.id} src={getObjectUrl(clip.mediaId)} style={{ ...applyTransform(clip.transform), filter: buildCssFilter((clip as ImageClip).colorAdjustments ?? DEFAULT_COLOR_ADJUSTMENTS), zIndex: zIndex(clip.trackId), outline: selectedIdSet.has(clip.id) ? "2px solid var(--color-error)" : undefined }} alt="" />
              }
              if (clip.type === "text") {
                if (clip.id === editingTextClipId) return null
                const s = clip.style ?? DEFAULT_TEXT_STYLE
                const justifyContent =
                  s.textAlign === "center" ? "center"
                    : s.textAlign === "right" ? "flex-end"
                      : "flex-start"
                return (
                  <div
                    key={clip.id}
                    style={{
                      ...applyTransform(clip.transform),
                      zIndex: zIndex(clip.trackId),
                      fontFamily: s.fontFamily,
                      fontSize: s.fontSize,
                      color: s.color,
                      backgroundColor: s.backgroundColor ?? "transparent",
                      textAlign: s.textAlign,
                      opacity: s.opacity,
                      fontWeight: s.bold ? "bold" : "normal",
                      fontStyle: s.italic ? "italic" : "normal",
                      display: "flex",
                      alignItems: "center",
                      justifyContent,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      overflow: "hidden",
                      pointerEvents: "none",
                      userSelect: "none",
                      lineHeight: s.lineHeight ?? 1.25,
                      outline: selectedIdSet.has(clip.id) ? "2px solid var(--color-error)" : undefined,
                    }}
                  >
                    {clip.content}
                  </div>
                )
              }
              return null
            })}
          </div>

          {/* Transform overlay */}
          {(() => {
            if (!!editingTextClipId) return null

            if (groupTransform && selectedCanvasTransforms.length > 1) {
              return (
                <TransformOverlay
                  clip={{ ...selectedCanvasClips[0], transform: groupTransform }}
                  previewWidth={previewSize.width}
                  previewHeight={previewSize.height}
                  onUpdate={handleGroupTransformUpdate}
                  onCommit={commitTransformsBatch}
                />
              )
            }

            if (!selectedClipId) return null
            let selectedClip: VideoClip | ImageClip | TextClip | undefined
            for (const track of project.tracks) {
              const found = track.clips.find(c => c.id === selectedClipId)
              if (found && found.type !== "audio") {
                selectedClip = found as VideoClip | ImageClip | TextClip
                break
              }
            }
            if (!selectedClip) return null

            // For text-only groups in group-edit mode, sync transform changes to all members.
            const textOnlyGroupMembers = (() => {
              if (!groupEditGroupId) return null
              const group = project.clipGroups?.find(g => g.id === groupEditGroupId)
              if (!group) return null
              const members: string[] = []
              for (const id of group.memberClipIds) {
                for (const track of project.tracks) {
                  const c = track.clips.find(c => c.id === id)
                  if (c) {
                    if (c.type !== "text") return null
                    members.push(id)
                    break
                  }
                }
              }
              return members.length > 1 && members.includes(selectedClipId) ? members : null
            })()

            if (textOnlyGroupMembers) {
              return (
                <TransformOverlay
                  clip={selectedClip}
                  previewWidth={previewSize.width}
                  previewHeight={previewSize.height}
                  onUpdate={t => {
                    const store = useEditorStore.getState()
                    const latestProject = store.project
                    let currentT: Transform | undefined
                    for (const track of latestProject.tracks) {
                      const c = track.clips.find(c => c.id === selectedClipId)
                      if (c && "transform" in c) { currentT = c.transform; break }
                    }
                    if (!currentT) return
                    const dx = (t.x ?? currentT.x) - currentT.x
                    const dy = (t.y ?? currentT.y) - currentT.y
                    const dw = (t.width ?? currentT.width) - currentT.width
                    const dh = (t.height ?? currentT.height) - currentT.height
                    const dr = (t.rotation ?? currentT.rotation) - currentT.rotation
                    const updates = textOnlyGroupMembers.map(id => {
                      for (const track of latestProject.tracks) {
                        const c = track.clips.find(c => c.id === id)
                        if (c && "transform" in c) {
                          const ct = c.transform
                          return {
                            clipId: id,
                            transform: {
                              x: ct.x + dx,
                              y: ct.y + dy,
                              width: Math.max(20, ct.width + dw),
                              height: Math.max(20, ct.height + dh),
                              rotation: ct.rotation + dr,
                            },
                          }
                        }
                      }
                      return null
                    }).filter(Boolean) as Array<{ clipId: string; transform: Partial<Transform> }>
                    store.updateClipTransformsBatch(updates)
                  }}
                  onCommit={commitTransformsBatch}
                />
              )
            }

            return (
              <TransformOverlay
                clip={selectedClip}
                previewWidth={previewSize.width}
                previewHeight={previewSize.height}
                onUpdate={t => updateClipTransform(selectedClipId, t)}
                onCommit={() => commitTransform(selectedClipId)}
              />
            )
          })()}

          {marquee && (
            <div
              className="absolute z-30 border-2 border-primary/70 bg-primary/15 pointer-events-none"
              style={{
                left: Math.min(marquee.x1, marquee.x2) * (previewSize.width / 1280),
                top: Math.min(marquee.y1, marquee.y2) * (previewSize.height / 720),
                width: Math.abs(marquee.x2 - marquee.x1) * (previewSize.width / 1280),
                height: Math.abs(marquee.y2 - marquee.y1) * (previewSize.height / 720),
              }}
            />
          )}


          {/* Inline text editor overlay */}
          {editingTextClipId && (() => {
            let editClip: TextClip | undefined
            for (const track of project.tracks) {
              const found = track.clips.find(c => c.id === editingTextClipId)
              if (found?.type === "text") { editClip = found as TextClip; break }
            }
            if (!editClip) return null
            const s = editClip.style ?? DEFAULT_TEXT_STYLE
            const scaleX = previewSize.width / 1280
            const scaleY = previewSize.height / 720
            const t = editClip.transform
            // Approximate vertical centering in textarea via top padding
            const singleLineH = s.fontSize * scaleY * 1.25
            const topPad = Math.max(4, (t.height * scaleY - singleLineH) / 2)
            return (
              <textarea
                key={editingTextClipId}
                ref={editTextareaRef}
                value={editingContent}
                onChange={e => {
                  const newContent = e.target.value
                  setEditingContent(newContent)
                  updateTextClip(editingTextClipId, { content: newContent })
                }}
                onKeyDown={e => {
                  if (e.key === "Escape") { e.preventDefault(); cancelTextEdit() }
                  else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitTextEdit() }
                }}
                onBlur={commitTextEdit}
                onClick={e => e.stopPropagation()}
                onDoubleClick={e => e.stopPropagation()}
                style={{
                  position: "absolute",
                  left: t.x * scaleX,
                  top: t.y * scaleY,
                  width: t.width * scaleX,
                  height: t.height * scaleY,
                  transform: `rotate(${t.rotation}deg)`,
                  transformOrigin: "top left",
                  zIndex: 100,
                  fontFamily: s.fontFamily,
                  fontSize: s.fontSize * scaleY,
                  color: s.color,
                  backgroundColor: s.backgroundColor ?? "rgba(0,0,0,0.65)",
                  textAlign: s.textAlign,
                  opacity: s.opacity,
                  fontWeight: s.bold ? "bold" : "normal",
                  fontStyle: s.italic ? "italic" : "normal",
                  lineHeight: s.lineHeight ?? 1.25,
                  resize: "none",
                  outline: "2px solid var(--color-error)",
                  outlineOffset: "-2px",
                  border: "none",
                  padding: `${topPad}px 4px 4px`,
                  margin: 0,
                  overflow: "hidden",
                  boxSizing: "border-box",
                  cursor: "text",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              />
            )
          })()}

          {/* // ======================================================
          // REMOVE: This is a playground for testing out the preview player and related features. It's not currently used in the app, but it can be useful for development and experimentation.
          // ====================================================== */}

          {activeTransitionDebug && (
            <div className="absolute left-2 top-2 z-20 min-w-68 rounded-md border border-outline/30 bg-inverse-surface/62 px-2.5 py-2 text-[11px] text-inverse-on-surface/86 backdrop-blur-sm">
              <div className="mb-1 font-semibold uppercase tracking-[0.06em] text-inverse-on-surface/70">Transition Debug</div>
              <div>ID: {activeTransitionDebug.transitionId}</div>
              <div>A: {activeTransitionDebug.sourceA}</div>
              <div>B: {activeTransitionDebug.sourceB}</div>
              <div>startTimeS: {activeTransitionDebug.startTimeS.toFixed(3)}</div>
              <div>endTimeS: {activeTransitionDebug.endTimeS.toFixed(3)}</div>
              <div>boundaryTimeS: {activeTransitionDebug.boundaryTimeS.toFixed(3)}</div>
              <div>progress: {activeTransitionDebug.progress.toFixed(3)}</div>
              <div>canonicalType: {activeTransitionDebug.canonicalType}</div>
            </div>
          )}

          {/* ============================================================== */}
        </div>
      </div>

      {/* Transport bar */}
      <div
        className="w-full shrink-0 flex items-center h-10 px-2 border-t border-t-outline/30 border-b border-b-outline/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_10px_rgba(0,0,0,0.35),0_12px_28px_rgba(0,0,0,0.22)]"
        style={{
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
        }}
      >
        {/* Transport buttons */}
        <TransportBtn icon={<SkipBack size={14} />} label="Skip to start" onClick={() => seek(0)} />
        <TransportBtn icon={<Rewind size={14} />} label="Rewind 5s" onClick={() => seek(Math.max(0, playhead - 5))} />
        <TransportBtn
          icon={isPlaying ? <Pause size={16} /> : <Play size={16} />}
          label={isPlaying ? "Pause" : "Play"}
          onClick={() => (isPlaying ? pause() : play())}
          primary
        />
        <TransportBtn icon={<FastForward size={14} />} label="Forward 5s" onClick={() => seek(Math.min(duration, playhead + 5))} />
        <TransportBtn icon={<SkipForward size={14} />} label="Skip to end" onClick={() => seek(duration)} />

        {/* Timecode */}
        <div
          className="font-mono text-sm text-on-surface/70 px-2.5 shrink-0 whitespace-nowrap min-w-22"
          aria-live="polite"
          aria-atomic="true"
        >
          {formatTimecode(playhead)}
        </div>

        {/* Scrubber */}
        <div className="flex-1 flex items-center px-2">
          <RangeSlider
            min={0}
            max={duration || 1}
            step={0.01}
            value={playhead}
            label="Seek"
            onPointerDown={() => pause()}
            onChange={seek}
          />
        </div>

        {/* Volume */}
        <TransportBtn
          icon={isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          label={isMuted ? "Unmute" : "Mute"}
          onClick={() => setIsMuted(v => !v)}
        />
        <div className="w-18 px-1">
          <RangeSlider
            min={0}
            max={100}
            step={1}
            value={isMuted ? 0 : Math.round(volume * 100)}
            label="Volume"
            onChange={v => { setVolume(v / 100); setIsMuted(false) }}
          />
        </div>
      </div>
    </div>
  )
}
