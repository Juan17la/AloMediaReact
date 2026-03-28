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
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={primary ? "transport-btn transport-btn-primary" : "transport-btn"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: primary ? 32 : 28,
        height: primary ? 32 : 28,
        flexShrink: 0,
        borderRadius: 6,
        border: "none",
        background: primary
          ? "var(--color-accent-red)"
          : hovered
            ? "rgba(255,255,255,0.07)"
            : "transparent",
        color: primary
          ? "rgba(255,255,255,0.95)"
          : hovered
            ? "rgba(255,255,255,0.90)"
            : "rgba(255,255,255,0.55)",
        cursor: "pointer",
        transition: "color 120ms ease-out, background-color 120ms ease-out",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", width: primary ? 16 : 14, height: primary ? 16 : 14 }}>
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

  secondaryClipsRef.current = secondaryVideoClips

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
          style={{
            position: "relative",
            background: "#0b0b0f",
            overflow: "hidden",
            cursor: "default",
            aspectRatio: "16 / 9",
            height: "100%",
            maxWidth: "100%",
            width: "auto",
            border: "2px solid rgba(255,255,255,0.07)",
            borderBottom: "2px solid rgba(255,255,255,0.04)",
          }}
        >
          <div
            ref={innerCanvasRef}
            style={{
              position: "absolute",
              width: 1280,
              height: 720,
              transformOrigin: "0 0",
              background: "#000000",
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
                  if (el) {
                    el.playbackRate = clip.speed ?? DEFAULT_SPEED
                    secondaryVideoElemsRef.current.set(clip.id, el)
                  }
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
                previewWidth={canvasContainerRef.current?.clientWidth ?? 640}
                previewHeight={canvasContainerRef.current?.clientHeight ?? 360}
                onUpdate={t => updateClipTransform(selectedClipId, t)}
                onCommit={() => commitTransform(selectedClipId)}
              />
            )
          })()}
        </div>
      </div>

      {/* Transport bar */}
      <div
        className="w-full shrink-0 flex items-center py-5 px-2"
        style={{
          height: 40,
          backdropFilter: "blur(24px) ",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
          borderTop: "1px solid rgba(255,255,255,0.10)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 10px rgba(0,0,0,0.35), 0 12px 28px rgba(0,0,0,0.22)",
          gap: 0,
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
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 12,
            color: "var(--color-accent-white)",
            padding: "0 10px",
            flexShrink: 0,
            whiteSpace: "nowrap",
            minWidth: 88,
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          {formatTimecode(playhead)}
        </div>

        {/* Scrubber */}
        <div className="flex-1 flex items-center" style={{ padding: "0 8px" }}>
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
        <div style={{ width: 72, padding: "0 4px" }}>
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
