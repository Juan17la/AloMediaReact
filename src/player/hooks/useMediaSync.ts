import { useEffect, useMemo, useRef } from "react"
import type { AudioClip, VideoClip } from "../../project/projectTypes"
import { useEditorStore } from "../../store/editorStore"
import { isPlayingRef } from "../../hooks/usePlayer"
import { buildClipIndex, lookupActiveClips } from "../timeline/clipLookup"
import type { ClipIndex } from "../timeline/clipLookup"
import { getActiveVideoClip } from "../timeline/activeClipResolver"
import { VideoBufferManager } from "../video/videoBuffer"
import { ObjectUrlRegistry } from "../utils/objectUrlRegistry"
import { syncAudioElements } from "../audio/audioSync"
import { syncAudioPool, destroyAudioPool } from "../audio/audioPool"
import { syncSecondaryVideoTracks } from "../video/secondaryVideoSync"
import { DEFAULT_SPEED } from "../../constants/speed"
import { compileUnifiedTransitions } from "../../engine/transitionCompiler"
import type { ResolvedTransition } from "../../project/projectTypes"

interface UseMediaSyncParams {
  onFrameRef: { current: ((ph: number) => void) | null }
  seekFlagResetRef: { current: (() => void) | null }
  playheadRef: { current: number }
  isMuted: boolean
  volume: number
  secondaryVideoElemsRef: { current: Map<string, HTMLVideoElement> }
  secondaryClipsRef: { current: VideoClip[] }
}

/**
 * Orchestrates video double-buffer management, audio sync, and clip indexing.
 * All DOM writes happen inside the RAF loop — no React re-renders during playback.
 */
export function useMediaSync({
  onFrameRef,
  seekFlagResetRef,
  playheadRef,
  isMuted,
  volume,
  secondaryVideoElemsRef,
  secondaryClipsRef,
}: UseMediaSyncParams) {
  const project = useEditorStore(s => s.project)
  const playhead = useEditorStore(s => s.playhead)
  const isPlaying = useEditorStore(s => s.isPlaying)
  const proxyMap = useEditorStore(s => s.proxyMap)
  const tracks = project.tracks

  const videoRefA = useRef<HTMLVideoElement>(null)
  const videoRefB = useRef<HTMLVideoElement>(null)
  const registryRef = useRef(new ObjectUrlRegistry())
  const managerRef = useRef<VideoBufferManager | null>(null)
  const clipIndexRef = useRef<ClipIndex>(buildClipIndex(tracks))
  const proxyMapRef = useRef(proxyMap)
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const prevActiveAudioIdsRef = useRef<Set<string>>(new Set())
  const isMutedRef = useRef(isMuted)
  const volumeRef = useRef(volume)

  useEffect(() => { clipIndexRef.current = buildClipIndex(tracks) }, [tracks])
  useEffect(() => { proxyMapRef.current = proxyMap }, [proxyMap])
  useEffect(() => { isMutedRef.current = isMuted }, [isMuted])
  useEffect(() => { volumeRef.current = volume }, [volume])

  useEffect(() => {
    seekFlagResetRef.current = () => managerRef.current?.resetSeekFlags()
    return () => { seekFlagResetRef.current = null }
  }, [seekFlagResetRef])

  useEffect(() => {
    const elA = videoRefA.current
    const elB = videoRefB.current
    if (!elA || !elB) return
    const manager = new VideoBufferManager(elA, elB)
    managerRef.current = manager

    const { project: p, playhead: ph } = useEditorStore.getState()
    const firstClip = getActiveVideoClip(p.tracks, ph)
    if (firstClip) {
      manager.initialize(firstClip, id => registryRef.current.getObjectUrl(id))
    }

    return () => { managerRef.current = null }
  }, [])

  // Primary video buffer elements are always muted — audio is driven exclusively
  // through the audio element pool so every track's audio is handled uniformly.
  useEffect(() => { managerRef.current?.setVolume(isMuted, volume) }, [isMuted, volume])

  useEffect(() => {
    for (const [, el] of audioElementsRef.current) {
      if (!el.paused) {
        el.muted = isMuted
        el.volume = volume
      }
    }
  }, [isMuted, volume])

  // Pool covers ALL tracks (video + audio) so VideoClip audio is not lost.
  const allTrackIds = useMemo(
    () => tracks
      .flatMap(t => t.clips)
      .filter((clip): clip is AudioClip | VideoClip => clip.type === "audio" || clip.type === "video")
      .map(clip => clip.id),
    [tracks],
  )

  const audioClipById = useMemo(() => {
    const byId = new Map<string, AudioClip | VideoClip>()
    for (const track of project.tracks) {
      for (const clip of track.clips) {
        if (clip.type !== "audio" && clip.type !== "video") continue
        byId.set(clip.id, clip)
      }
    }
    return byId
  }, [project])

  const resolvedTransitions = useMemo(() => {
    const transitionInByClipId = new Map<string, ResolvedTransition>()
    const transitionOutByClipId = new Map<string, ResolvedTransition>()

    const compiled = compileUnifiedTransitions(project)

    for (const warning of compiled.warnings) {
      console.warn(warning)
    }

    for (const transition of compiled.transitions) {
      const hasClipA = !!transition.clipARef.clipId
      const hasClipB = !!transition.clipBRef.clipId

      if (hasClipA && hasClipB) {
        transitionOutByClipId.set(transition.clipARef.clipId!, {
          type: transition.typeCanonical,
          duration: transition.durationS,
          overlapStartS: transition.startTimeS,
          kind: "crossfade",
        })
        transitionInByClipId.set(transition.clipBRef.clipId!, {
          type: transition.typeCanonical,
          duration: transition.durationS,
          overlapStartS: transition.startTimeS,
          kind: "crossfade",
        })
        continue
      }

      if (hasClipA) {
        transitionOutByClipId.set(transition.clipARef.clipId!, {
          type: transition.typeCanonical,
          duration: transition.durationS,
          overlapStartS: transition.startTimeS,
          kind: "fade_to_black",
        })
        continue
      }

      if (hasClipB) {
        transitionInByClipId.set(transition.clipBRef.clipId!, {
          type: transition.typeCanonical,
          duration: transition.durationS,
          overlapStartS: transition.startTimeS,
          kind: "fade_from_black",
        })
      }
    }

    return { transitionInByClipId, transitionOutByClipId }
  }, [project])

  useEffect(() => { syncAudioPool(audioElementsRef.current, allTrackIds) }, [allTrackIds])
  useEffect(() => () => { destroyAudioPool(audioElementsRef.current) }, [])

  const syncMediaElements = useRef<(ph: number) => void | null>(null)

  // Stable sync implementation that reads latest values from refs.
  useEffect(() => {
    const impl = (ph: number) => {
      const p = useEditorStore.getState().project
      const activeVideoClip = getActiveVideoClip(p.tracks, ph)
      // Use raw file URL (not proxy) for the primary buffer so audio is preserved.
      // Proxies are generated with -an (no audio). Secondary elements are muted and
      // can keep using the proxy URL for smooth scrubbing.
      const getUrl = (id: string) => registryRef.current.getObjectUrl(id)
      const getIsPlaying = () => isPlayingRef.current
      const outgoing = activeVideoClip ? resolvedTransitions.transitionOutByClipId.get(activeVideoClip.id) : undefined
      const outgoingCrossfade = outgoing?.kind === "crossfade" ? outgoing : undefined

      managerRef.current?.syncVideo(
        ph,
        p.tracks,
        getUrl,
        getIsPlaying,
        outgoingCrossfade,
        resolvedTransitions.transitionInByClipId,
        resolvedTransitions.transitionOutByClipId,
      )

      syncSecondaryVideoTracks({
        clips: secondaryClipsRef.current,
        elements: secondaryVideoElemsRef.current,
        playhead: ph,
        isPlaying: isPlayingRef.current,
      })

      prevActiveAudioIdsRef.current = syncAudioElements(
        ph,
        isPlayingRef.current,
        clipIndexRef.current,
        audioClipById,
        audioElementsRef.current,
        prevActiveAudioIdsRef.current,
        id => registryRef.current.getObjectUrl(id),
        resolvedTransitions,
        isMutedRef.current,
        volumeRef.current,
      )
    }

    syncMediaElements.current = impl
    return () => { syncMediaElements.current = null }
  }, [secondaryClipsRef, secondaryVideoElemsRef, resolvedTransitions, audioClipById])

  useEffect(() => {
    onFrameRef.current = ph => { if (syncMediaElements.current) syncMediaElements.current(ph) }
    return () => { onFrameRef.current = null }
  }, [onFrameRef])

  useEffect(() => {
    if (isPlayingRef.current) return
    if (syncMediaElements.current) syncMediaElements.current(playhead)
  }, [playhead])

  useEffect(() => {
    if (isPlaying) {
      managerRef.current?.playActive()
    } else {
      managerRef.current?.pauseActive()
    }

    for (const [, el] of secondaryVideoElemsRef.current) {
      if (isPlaying) {
        el.play().catch(() => { })
      } else {
        el.pause()
      }
    }

    const ph = playheadRef.current
    const activeAudioClips = lookupActiveClips(clipIndexRef.current, ph)
      .filter((c): c is AudioClip | VideoClip => c.type === "audio" || c.type === "video")

    for (const clip of activeAudioClips) {
      const el = audioElementsRef.current.get(clip.id)
      if (!el) continue
      el.playbackRate = clip.speed ?? DEFAULT_SPEED
      if (isPlaying) {
        el.muted = isMuted
        el.volume = volume
        el.play().catch(() => { })
      } else {
        el.pause()
      }
    }
  }, [isPlaying, isMuted, volume, playheadRef, secondaryVideoElemsRef])

  useEffect(() => () => { registryRef.current.revokeAll() }, [])

  const getObjectUrl = (mediaId: string) => registryRef.current.getObjectUrl(mediaId)
  const getPlaybackUrl = (mediaId: string) =>
    registryRef.current.getPlaybackUrl(mediaId, proxyMapRef.current)

  return { videoRefA, videoRefB, getObjectUrl, getPlaybackUrl }
}
