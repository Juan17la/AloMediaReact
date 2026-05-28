import type { AudioClip, VideoClip, ResolvedTransition, Track, Project } from "../../project/projectTypes"
import type { ClipIndex } from "../timeline/clipLookup"
import type { ProxyState } from "../../store/slices/proxySlice"
import { getActiveVideoClip } from "../timeline/activeClipResolver"
import { VideoBufferManager } from "../video/videoBuffer"
import { ObjectUrlRegistry } from "../utils/objectUrlRegistry"
import { MediaBuffer } from "../audio/mediaBuffer"
import { syncSecondaryVideoTracks } from "../video/secondaryVideoSync"
import { compileUnifiedTransitions } from "../../engine/transitionCompiler"

export interface SyncManagerConfig {
  elA: HTMLVideoElement
  elB: HTMLVideoElement
}

interface SyncAudioTransitions {
  transitionInByClipId: Map<string, ResolvedTransition>
  transitionOutByClipId: Map<string, ResolvedTransition>
}

/**
 * Manages audio/video synchronization for the player.
 *
 * OOP Justification: This class encapsulates complex mutable state (video elements,
 * audio elements, clip index, registry, buffer manager) that cannot be reasonably
 * modeled as pure functions due to:
 *  - DOM resource lifecycle (video/audio elements creation, cleanup)
 *  - Coordination of multiple subsystems (VideoBufferManager, MediaBuffer, ObjectUrlRegistry)
 *  - Per-frame state that persists across RAF frames
 *  - Complex synchronization logic with transitions
 */
export class SyncManager {
  private videoBufferManager: VideoBufferManager | null = null
  private objectUrlRegistry: ObjectUrlRegistry
  private mediaBuffer: MediaBuffer
  private clipIndexRef: ClipIndex | null = null
  private audioElementsRef: Map<string, HTMLAudioElement> = new Map()
  private prevActiveAudioIdsRef: Set<string> = new Set()
  private audioPlayStartPhRef: Map<string, number> = new Map()
  private secondaryVideoElemsRef: Map<string, HTMLVideoElement> = new Map()
  private secondaryClipsRef: VideoClip[] = []
  private resolvedTransitions: SyncAudioTransitions = {
    transitionInByClipId: new Map(),
    transitionOutByClipId: new Map(),
  }

  constructor() {
    this.objectUrlRegistry = new ObjectUrlRegistry()
    this.mediaBuffer = new MediaBuffer()
  }

  initializeVideo(elA: HTMLVideoElement, elB: HTMLVideoElement, firstClip: VideoClip | null): void {
    this.videoBufferManager = new VideoBufferManager(elA, elB)
    if (firstClip) {
      this.videoBufferManager.initialize(firstClip, id => this.objectUrlRegistry.getObjectUrl(id))
    }
  }

  resetSeekFlags(): void {
    this.videoBufferManager?.resetSeekFlags()
  }

  playActive(): void {
    this.videoBufferManager?.playActive()
  }

  pauseActive(): void {
    this.videoBufferManager?.pauseActive()
  }

  revokeAll(): void {
    this.objectUrlRegistry.revokeAll()
  }

  getObjectUrl(mediaId: string): string | undefined {
    return this.objectUrlRegistry.getObjectUrl(mediaId)
  }

  getPlaybackUrl(mediaId: string, proxyMap: Record<string, ProxyState>): string | undefined {
    return this.objectUrlRegistry.getPlaybackUrl(mediaId, proxyMap)
  }

  syncMediaElements(
    ph: number,
    tracks: Track[],
    getIsPlaying: () => boolean,
  ): void {
    if (!this.videoBufferManager || !this.clipIndexRef) return

    const getUrl = (id: string) => this.objectUrlRegistry.getObjectUrl(id)
    const getIsPlayingFn = () => getIsPlaying()
    const activeVideoClip = getActiveVideoClip(tracks, ph)
    const outgoing = activeVideoClip
      ? this.resolvedTransitions.transitionOutByClipId.get(activeVideoClip.id)
      : undefined
    const outgoingCrossfade = outgoing?.kind === "crossfade" ? outgoing : undefined

    this.videoBufferManager.syncVideo(
      ph,
      tracks,
      getUrl,
      getIsPlayingFn,
      outgoingCrossfade,
      this.resolvedTransitions.transitionInByClipId,
      this.resolvedTransitions.transitionOutByClipId,
    )

    syncSecondaryVideoTracks({
      clips: this.secondaryClipsRef,
      elements: this.secondaryVideoElemsRef,
      playhead: ph,
      isPlaying: getIsPlaying(),
    })

    const audioClipById = new Map<string, AudioClip | VideoClip>()
    for (const track of tracks) {
      for (const clip of track.clips) {
        if (clip.type !== "audio" && clip.type !== "video") continue
        audioClipById.set(clip.id, clip)
      }
    }

    this.prevActiveAudioIdsRef = this.mediaBuffer.syncAudioElements(
      ph,
      getIsPlaying(),
      this.clipIndexRef,
      audioClipById,
      this.audioElementsRef,
      this.prevActiveAudioIdsRef,
      getUrl,
      this.resolvedTransitions,
      false,
      1,
      this.audioPlayStartPhRef,
    )
  }

  updateClipIndex(clipIndex: ClipIndex): void {
    this.clipIndexRef = clipIndex
  }

  updateResolvedTransitions(project: Project): void {
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

    this.resolvedTransitions = { transitionInByClipId, transitionOutByClipId }
  }

  syncAudioPool(audioTrackIds: string[]): void {
    const needed = new Set(audioTrackIds)

    for (const [trackId, el] of this.audioElementsRef) {
      if (!needed.has(trackId)) {
        el.pause()
        if (el.parentNode) el.parentNode.removeChild(el)
        this.mediaBuffer.destroyAudioContext(trackId)
        this.audioElementsRef.delete(trackId)
      }
    }

    for (const trackId of audioTrackIds) {
      if (this.audioElementsRef.has(trackId)) continue
      const el = document.createElement("audio")
      el.preload = "auto"
      el.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none"
      document.body.appendChild(el)
      this.audioElementsRef.set(trackId, el)
    }
  }

  destroyAudioPool(): void {
    for (const [trackId, el] of this.audioElementsRef) {
      el.pause()
      if (el.parentNode) el.parentNode.removeChild(el)
      this.mediaBuffer.destroyAudioContext(trackId)
    }
    this.audioElementsRef.clear()
  }

  setSecondaryVideo(elements: Map<string, HTMLVideoElement>, clips: VideoClip[]): void {
    this.secondaryVideoElemsRef = elements
    this.secondaryClipsRef = clips
  }

  getMediaBuffer(): MediaBuffer {
    return this.mediaBuffer
  }

  getObjectUrlRegistry(): ObjectUrlRegistry {
    return this.objectUrlRegistry
  }
}