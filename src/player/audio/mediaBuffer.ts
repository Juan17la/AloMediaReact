import type { AudioClip, VideoClip, AudioConfig } from "../../project/projectTypes"
import type { ResolvedTransition } from "../../project/projectTypes"
import type { ClipIndex } from "../timeline/clipLookup"
import { lookupActiveClips } from "../timeline/clipLookup"
import { DRIFT_CORRECTION_THRESHOLD_S } from "../../constants/timeline"
import { DEFAULT_AUDIO_CONFIG } from "../../constants/audioConfig"
import { DEFAULT_SPEED } from "../../constants/speed"
import { CLIP_EPSILON } from "../../utils/time"

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

type AudioBearingClip = AudioClip | VideoClip

interface SyncAudioTransitions {
  transitionInByClipId: Map<string, ResolvedTransition>
  transitionOutByClipId: Map<string, ResolvedTransition>
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function computeEqualPowerGains(progress: number): { gainA: number; gainB: number } {
  const clamped = clamp01(progress)
  return {
    gainA: Math.cos(clamped * Math.PI * 0.5),
    gainB: Math.sin(clamped * Math.PI * 0.5),
  }
}

export function computeTransitionProgress(ph: number, transition: ResolvedTransition): number {
  if (transition.duration <= CLIP_EPSILON) return 1
  return clamp01((ph - transition.overlapStartS) / transition.duration)
}

function getCrossfadeGain(ph: number, clip: AudioBearingClip, transitions: SyncAudioTransitions): number {
  const inTransition = transitions.transitionInByClipId.get(clip.id)
  if (inTransition?.kind === "crossfade") {
    const progress = computeTransitionProgress(ph, inTransition)
    return computeEqualPowerGains(progress).gainB
  }

  const outTransition = transitions.transitionOutByClipId.get(clip.id)
  if (outTransition?.kind === "crossfade") {
    const progress = computeTransitionProgress(ph, outTransition)
    return computeEqualPowerGains(progress).gainA
  }

  return 1
}

/**
 * Manages audio element synchronization and Web Audio API resources.
 *
 * OOP Justification: This class encapsulates complex mutable state (AudioContext,
 * MediaElementAudioSourceNodes, GainNodes, StereoPannerNodes) that cannot be
 * reasonably modeled as pure functions due to:
 *  - Browser audio resource lifecycle (creation, caching, cleanup)
 *  - Web Audio API node graph management
 *  - Per-track state that persists across frames
 */
export class MediaBuffer {
  private audioContexts = new Map<string, AudioContext>()
  private mediaElementSources = new Map<string, MediaElementAudioSourceNode>()
  private gainNodes = new Map<string, GainNode>()
  private pannerNodes = new Map<string, StereoPannerNode>()

  syncAudioElements(
    ph: number,
    playing: boolean,
    clipIndex: ClipIndex,
    clipById: Map<string, AudioBearingClip>,
    audioElements: Map<string, HTMLAudioElement>,
    prevActiveIds: Set<string>,
    getObjectUrl: (mediaId: string) => string | undefined,
    transitions: SyncAudioTransitions,
    isMuted = false,
    volume = 1,
    audioPlayStartPh: Map<string, number> = new Map(),
  ): Set<string> {
    const activeAudioClips = lookupActiveClips(clipIndex, ph).filter(
      (c): c is AudioBearingClip => c.type === "audio" || c.type === "video",
    )

    const activeById = new Map<string, AudioBearingClip>()
    for (const clip of activeAudioClips) {
      activeById.set(clip.id, clip)
    }

    for (const [clipId, transition] of transitions.transitionInByClipId) {
      if (transition.kind !== "crossfade") continue
      if (ph < transition.overlapStartS - CLIP_EPSILON) continue
      if (ph > transition.overlapStartS + transition.duration + CLIP_EPSILON) continue
      const clip = clipById.get(clipId)
      if (!clip) continue
      activeById.set(clipId, clip)
    }

    const allActiveClips = Array.from(activeById.values())
    const activeClipIds = new Set(allActiveClips.map(c => c.id))

    const currentTimes = new Map<string, number>()
    for (const [clipId, el] of audioElements) {
      currentTimes.set(clipId, el.currentTime)
    }

    for (const [clipId, el] of audioElements) {
      if (!activeClipIds.has(clipId)) {
        el.pause()
        const ctx = this.audioContexts.get(clipId)
        const gainNode = this.gainNodes.get(clipId)
        const pannerNode = this.pannerNodes.get(clipId)
        if (gainNode && ctx) {
          gainNode.disconnect()
          this.gainNodes.delete(clipId)
        }
        if (pannerNode && ctx) {
          pannerNode.disconnect()
          this.pannerNodes.delete(clipId)
        }
        audioPlayStartPh.delete(clipId)
      }
    }

    const activeIds = new Set(allActiveClips.map(c => c.id))
    const newlyActive = new Set([...activeIds].filter(id => !prevActiveIds.has(id)))

    for (const clip of allActiveClips) {
      const el = audioElements.get(clip.id)
      if (!el) continue
      const url = getObjectUrl(clip.mediaId)
      if (url && el.src !== url) el.src = url
      const clipSpeed = clip.speed ?? DEFAULT_SPEED
      el.playbackRate = clipSpeed
      const startPh = playing ? (audioPlayStartPh.get(clip.id) ?? clip.timelineStart) : clip.timelineStart
      const mediaTime = clip.mediaStart + (ph - startPh) * clipSpeed
      const clipConfig = clip.audioConfig ?? DEFAULT_AUDIO_CONFIG

      const crossfadeGain = getCrossfadeGain(ph, clip, transitions)

      if (newlyActive.has(clip.id)) {
        el.currentTime = Math.max(0, mediaTime)
        if (playing) {
          audioPlayStartPh.set(clip.id, ph)
          const ctx = this.audioContexts.get(clip.id)
          const source = this.mediaElementSources.get(clip.id)
          const gainNode = this.gainNodes.get(clip.id)
          const pannerNode = this.pannerNodes.get(clip.id)
          this.applyAudioConfig(el, clipConfig, isMuted, volume * crossfadeGain, clip.id, ctx, source, gainNode, pannerNode)
          el.play().catch(() => { })
        }
      } else if (!playing) {
        if (el.readyState >= 1) el.currentTime = mediaTime
      } else {
        const current = currentTimes.get(clip.id) ?? 0
        if (Math.abs(current - mediaTime) > DRIFT_CORRECTION_THRESHOLD_S) {
          el.currentTime = mediaTime
          audioPlayStartPh.set(clip.id, ph)
        }
        const ctx = this.audioContexts.get(clip.id)
        const source = this.mediaElementSources.get(clip.id)
        const gainNode = this.gainNodes.get(clip.id)
        const pannerNode = this.pannerNodes.get(clip.id)
        this.applyAudioConfig(el, clipConfig, isMuted, volume * crossfadeGain, clip.id, ctx, source, gainNode, pannerNode)
      }
    }

    return activeIds
  }

  private applyAudioConfig(
    el: HTMLAudioElement,
    config: AudioConfig,
    globalMute: boolean,
    globalVolume: number,
    trackId: string,
    ctx: AudioContext | undefined,
    source: MediaElementAudioSourceNode | undefined,
    gainNode: GainNode | undefined,
    pannerNode: StereoPannerNode | undefined,
  ): void {
    const isEffectivelyMuted = globalMute || config.muted
    el.muted = isEffectivelyMuted

    if (isEffectivelyMuted) {
      el.volume = 0
      return
    }

    const combinedVolume = globalVolume * config.volume

    if (combinedVolume <= 1.0) {
      el.volume = Math.max(0, Math.min(1, combinedVolume))
      if (Math.abs(config.balance) > 0.001) {
        this.setupPannerOnly(el, config.balance, trackId, ctx, source, pannerNode)
      } else {
        this.disconnectPanNode(trackId, ctx, gainNode)
      }
      return
    }

    this.setupGainNode(el, combinedVolume, config.balance, trackId, ctx, source, gainNode, pannerNode)
  }

  private setupGainNode(
    el: HTMLAudioElement,
    volume: number,
    balance: number,
    trackId: string,
    ctx: AudioContext | undefined,
    source: MediaElementAudioSourceNode | undefined,
    gainNode: GainNode | undefined,
    pannerNode: StereoPannerNode | undefined,
  ): void {
    let audioCtx = ctx
    let mediaSource = source
    let gain = gainNode
    let pan = pannerNode

    if (!audioCtx) {
      const Ctor = window.AudioContext || window.webkitAudioContext
      if (!Ctor) return
      audioCtx = new Ctor()
      this.audioContexts.set(trackId, audioCtx)
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => { })
    }

    if (!mediaSource) {
      try {
        const newSource = audioCtx.createMediaElementSource(el)
        this.mediaElementSources.set(trackId, newSource)
        mediaSource = newSource
      } catch (_e) {
        return
      }
    }

    if (!gain) {
      gain = audioCtx.createGain()
      try { mediaSource.disconnect() } catch (_e) {
        return
      }
      mediaSource.connect(gain)
      this.gainNodes.set(trackId, gain)
      gain.connect(audioCtx.destination)
    }

    gain.gain.setValueAtTime(Math.max(0, Math.min(2, volume)), audioCtx.currentTime)

    if (Math.abs(balance) > 0.001) {
      if (!pan) {
        pan = audioCtx.createStereoPanner()
        gain.disconnect()
        gain.connect(pan)
        pan.connect(audioCtx.destination)
        this.pannerNodes.set(trackId, pan)
      }
      pan.pan.setValueAtTime(Math.max(-1, Math.min(1, balance)), audioCtx.currentTime)
    } else {
      if (pan) {
        pan.disconnect()
        gain.disconnect()
        gain.connect(audioCtx.destination)
        this.pannerNodes.delete(trackId)
      }
    }
  }

  private setupPannerOnly(
    el: HTMLAudioElement,
    balance: number,
    trackId: string,
    ctx: AudioContext | undefined,
    source: MediaElementAudioSourceNode | undefined,
    pannerNode: StereoPannerNode | undefined,
  ): void {
    let audioCtx = ctx
    let mediaSource = source
    let pan = pannerNode

    if (!audioCtx) {
      const Ctor = window.AudioContext || window.webkitAudioContext
      if (!Ctor) return
      audioCtx = new Ctor()
      this.audioContexts.set(trackId, audioCtx)
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => { })
    }

    if (!mediaSource) {
      try {
        const newSource = audioCtx.createMediaElementSource(el)
        this.mediaElementSources.set(trackId, newSource)
        mediaSource = newSource
      } catch (_e) {
        return
      }
    }

    if (!pan) {
      pan = audioCtx.createStereoPanner()
      try { mediaSource.disconnect() } catch (_e) {
        // Silently ignore if source was not previously connected
      }
      mediaSource.connect(pan)
      pan.connect(audioCtx.destination)
      this.pannerNodes.set(trackId, pan)
    }

    pan.pan.setValueAtTime(Math.max(-1, Math.min(1, balance)), audioCtx.currentTime)
  }

  private disconnectPanNode(trackId: string, ctx: AudioContext | undefined, gainNode: GainNode | undefined): void {
    const pannerNode = this.pannerNodes.get(trackId)
    if (!pannerNode || !gainNode) return
    try {
      pannerNode.disconnect()
      gainNode.disconnect()
      let audioCtx = ctx
      if (!audioCtx) {
        const Ctor = window.AudioContext || window.webkitAudioContext
        if (!Ctor) return
        audioCtx = new Ctor()
        this.audioContexts.set(trackId, audioCtx)
      }
    } catch {
      // Silently ignore errors
    }
  }

  destroyAudioContext(trackId: string): void {
    const gainNode = this.gainNodes.get(trackId)
    const pannerNode = this.pannerNodes.get(trackId)
    const source = this.mediaElementSources.get(trackId)
    try {
      if (pannerNode) {
        pannerNode.disconnect()
        this.pannerNodes.delete(trackId)
      }
      if (gainNode) {
        gainNode.disconnect()
        this.gainNodes.delete(trackId)
      }
      if (source) {
        source.disconnect()
        this.mediaElementSources.delete(trackId)
      }
    } catch (_e) {
      // Silently ignore errors during cleanup
    }
    this.audioContexts.delete(trackId)
  }

  disconnectAll(): void {
    for (const trackId of [...this.audioContexts.keys()]) {
      const gainNode = this.gainNodes.get(trackId)
      const pannerNode = this.pannerNodes.get(trackId)
      const source = this.mediaElementSources.get(trackId)
      const ctx = this.audioContexts.get(trackId)
      try {
        if (pannerNode) pannerNode.disconnect()
        if (gainNode) gainNode.disconnect()
        if (source && ctx && ctx.state !== "closed") {
          source.connect(ctx.destination)
        }
      } catch (_e) {
        // Silently ignore errors during cleanup (e.g. context already closed)
      }
    }
    this.gainNodes.clear()
    this.pannerNodes.clear()
  }
}