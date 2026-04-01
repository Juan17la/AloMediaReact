import { useEffect, useMemo, useRef, useState } from "react"
import { SkipBack, Rewind, Play, Pause, FastForward, SkipForward, Volume2, VolumeX } from "lucide-react"
import type { VideoClip, ImageClip, TextClip } from "../../project/projectTypes"
import { useEditorStore } from "../../store/editorStore"
import { usePlayer } from "../../hooks/usePlayer"
import { getProjectDuration, CLIP_EPSILON } from "../../utils/time"
import { useMediaSync } from "../../player/hooks/useMediaSync"
import { applyTransform } from "../../player/render/transformUtils"
import { buildCssFilter } from "../../utils/colorAdjustmentFilters"
import { DEFAULT_COLOR_ADJUSTMENTS } from "../../constants/colorAdjustments"
import { setupCanvasScaling } from "../../player/render/canvasScaling"
import { TransformOverlay } from "./TransformOverlay"
import { RangeSlider } from "../ui/RangeSlider"
import { getActiveVideoClip } from "../../player/timeline/activeClipResolver"
import { DEFAULT_SPEED } from "../../constants/speed"
import { compileUnifiedTransitions } from "../../engine/transitionCompiler"


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
    ? "flex items-center justify-center w-8 h-8 shrink-0 rounded-md border-0 bg-[var(--color-accent-red)] text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:brightness-[0.86] active:scale-95 transition-all duration-100 cursor-pointer"
    : "flex items-center justify-center w-7 h-7 shrink-0 rounded-md border-0 bg-transparent text-white/55 hover:bg-white/7 hover:text-white/90 active:text-[var(--color-accent-red)] active:scale-95 transition-all duration-100 cursor-pointer"

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
  const updateClipTransform = useEditorStore(s => s.updateClipTransform)
  const commitTransform = useEditorStore(s => s.commitTransform)
  const setSelectedClip = useEditorStore(s => s.setSelectedClip)
  const { play, pause, seek, onFrameRef, playheadRef, seekFlagResetRef } = usePlayer()
  const tracks = project.tracks
  const duration = getProjectDuration(tracks)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const innerCanvasRef = useRef<HTMLDivElement>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)

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
    () => [...project.tracks].sort((a, b) => b.order - a.order),
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

  const trackOrderMap = useMemo(
    () => new Map(project.tracks.map(t => [t.id, t.order])),
    [project.tracks],
  )
  const maxOrder = useMemo(
    () => Math.max(0, ...project.tracks.map(t => t.order)),
    [project.tracks],
  )
  const zIndex = (trackId: string) => maxOrder - (trackOrderMap.get(trackId) ?? 0) + 1

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

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
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

  return (
    <div className="flex flex-col min-h-0 h-full w-full items-center justify-center">
      {/* Canvas area */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden my-2">
        <div
          ref={canvasContainerRef}
          onClick={handleCanvasClick}
          className="relative bg-(--color-background-base) overflow-hidden cursor-default aspect-video h-full max-w-full w-auto border-2 border-white/7 border-b-glass"
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
                style={{ ...applyTransform(clip.transform), filter: buildCssFilter(clip.colorAdjustments ?? DEFAULT_COLOR_ADJUSTMENTS), zIndex: zIndex(clip.trackId), pointerEvents: "none" }}
                muted
                preload="auto"
                playsInline
                disablePictureInPicture
              />
            ))}

            {staticElements.map(clip => {
              if (clip.type === "image") {
                return <img key={clip.id} src={getObjectUrl(clip.mediaId)} style={{ ...applyTransform(clip.transform), filter: buildCssFilter((clip as ImageClip).colorAdjustments ?? DEFAULT_COLOR_ADJUSTMENTS), zIndex: zIndex(clip.trackId) }} alt="" />
              }
              if (clip.type === "text") {
                return <div key={clip.id} style={{ ...applyTransform(clip.transform), zIndex: zIndex(clip.trackId) }}>{clip.content}</div>
              }
              return null
            })}
          </div>

          {/* Transform overlay */}
          {(() => {
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


          {/* // ======================================================
          // REMOVE: This is a playground for testing out the preview player and related features. It's not currently used in the app, but it can be useful for development and experimentation.
          // ====================================================== */}

          {activeTransitionDebug && (
            <div className="absolute left-2 top-2 z-20 min-w-68 rounded-md border border-white/20 bg-black/62 px-2.5 py-2 text-[11px] text-white/86 backdrop-blur-sm">
              <div className="mb-1 font-semibold uppercase tracking-[0.06em] text-white/70">Transition Debug</div>
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
        className="w-full shrink-0 flex items-center h-10 px-2 border-t border-t-white/10 border-b border-b-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_10px_rgba(0,0,0,0.35),0_12px_28px_rgba(0,0,0,0.22)]"
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
          className="font-mono text-sm text-white/70 px-2.5 shrink-0 whitespace-nowrap min-w-22"
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
