import { useEffect, useRef } from "react"
import type { AudioClip, Transform, VideoClip } from "../../project/projectTypes"
import { useEditorStore } from "../../store/editorStore"
import { fileMap } from "../../store/editorStore"

function applyTransform(t: Transform): React.CSSProperties {
  return {
    position: "absolute",
    left: t.x,
    top: t.y,
    width: t.width,
    height: t.height,
    transform: `rotate(${t.rotation}deg)`,
  }
}

export function PreviewPlayer() {
  const project = useEditorStore(s => s.project)
  const playhead = useEditorStore(s => s.playhead)
  const isPlaying = useEditorStore(s => s.isPlaying)

  // Object URL registry — create once per mediaId, revoke on unmount
  const objectUrlsRef = useRef<Map<string, string>>(new Map())
  // Element refs for video/audio sync — keyed by clipId
  const mediaRefsRef = useRef<Map<string, HTMLVideoElement | HTMLAudioElement>>(new Map())

  function getObjectUrl(mediaId: string): string | undefined {
    const existing = objectUrlsRef.current.get(mediaId)
    if (existing) return existing
    const file = fileMap.get(mediaId)
    if (!file) return undefined
    const url = URL.createObjectURL(file)
    objectUrlsRef.current.set(mediaId, url)
    return url
  }

  // Revoke all object URLs when the component unmounts
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    }
  }, [])

  // Sync currentTime on every playhead change — covers scrubbing when paused.
  // Also pauses elements whose clip is no longer at the current playhead position.
  useEffect(() => {
    const { project: p, playhead: ph, isPlaying: playing } = useEditorStore.getState()

    const activeIds = new Set(
      p.tracks.flatMap(t =>
        t.clips.filter(c => c.timelineStart <= ph && ph <= c.timelineEnd).map(c => c.id)
      )
    )

    // Pause and reset clips that just left the active range
    for (const [clipId, el] of mediaRefsRef.current) {
      if (!activeIds.has(clipId)) {
        el.pause()
        for (const track of p.tracks) {
          const clip = track.clips.find(c => c.id === clipId)
          if (clip && (clip.type === "video" || clip.type === "audio")) {
            el.currentTime = (clip as VideoClip | AudioClip).mediaStart
            break
          }
        }
      }
    }

    if (playing) return // RAF loop owns sync during active playback

    for (const track of p.tracks) {
      for (const clip of track.clips) {
        if (!activeIds.has(clip.id)) continue
        if (clip.type !== "video" && clip.type !== "audio") continue
        const el = mediaRefsRef.current.get(clip.id)
        if (!el) continue
        const offset = ph - clip.timelineStart
        el.currentTime = (clip as VideoClip | AudioClip).mediaStart + offset
      }
    }
  }, [playhead])

  // Play or pause all active media elements when isPlaying toggles
  useEffect(() => {
    const { project: p, playhead: ph } = useEditorStore.getState()
    for (const track of p.tracks) {
      for (const clip of track.clips) {
        if (clip.timelineStart > ph || ph > clip.timelineEnd) continue
        if (clip.type !== "video" && clip.type !== "audio") continue
        const el = mediaRefsRef.current.get(clip.id)
        if (!el) continue
        if (isPlaying) {
          el.play().catch(() => {})
        } else {
          el.pause()
        }
      }
    }
  }, [isPlaying])

  const sortedTracks = [...project.tracks].sort((a, b) => a.order - b.order)

  const activeClips = sortedTracks.flatMap(track =>
    track.clips.filter(
      clip => clip.timelineStart <= playhead && playhead <= clip.timelineEnd
    )
  )

  return (
    // Outer shell is 640x360 (half of 1280x720 canvas)
    <div
      style={{
        position: "relative",
        width: 640,
        height: 360,
        backgroundColor: "#000",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Inner canvas scaled 0.5 — all transforms are authored at 1280x720 */}
      <div
        style={{
          position: "absolute",
          width: 1280,
          height: 720,
          transform: "scale(0.5)",
          transformOrigin: "0 0",
        }}
      >
        {activeClips.map(clip => {
          if (clip.type === "video") {
            const url = getObjectUrl(clip.mediaId)
            return (
              <video
                key={clip.id}
                ref={el => { if (el) mediaRefsRef.current.set(clip.id, el) }}
                src={url}
                style={applyTransform(clip.transform)}
                muted
                playsInline
              />
            )
          }

          if (clip.type === "image") {
            const url = getObjectUrl(clip.mediaId)
            return (
              <img
                key={clip.id}
                src={url}
                style={applyTransform(clip.transform)}
                alt=""
              />
            )
          }

          if (clip.type === "text") {
            return (
              <div key={clip.id} style={applyTransform(clip.transform)}>
                {clip.content}
              </div>
            )
          }

          if (clip.type === "audio") {
            const url = getObjectUrl(clip.mediaId)
            return (
              <audio
                key={clip.id}
                ref={el => { if (el) mediaRefsRef.current.set(clip.id, el) }}
                src={url}
              />
            )
          }

          return null
        })}
      </div>
    </div>
  )
}
