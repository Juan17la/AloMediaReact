import type { ClipTransition, ResolvedTransition, Track, VideoClip } from "../../project/projectTypes"
import { PRELOAD_LOOKAHEAD_MS, DRIFT_CORRECTION_THRESHOLD_S } from "../../constants/timeline"
import { getActiveVideoClip, getNextVideoClip } from "../timeline/activeClipResolver"
import { applyTransformToEl, applyColorAdjustmentsToEl } from "../render/transformUtils"
import { DEFAULT_SPEED } from "../../constants/speed"
import { CLIP_EPSILON } from "../../utils/time"
import { runTransitionApproximation, type TransitionSwapMetadata } from "./videoTransitions"

export interface BufferState {
  activeClipId: string | null
  activeMediaId: string | null
  bufferedClipId: string | null
  bufferedMediaId: string | null
}

type UrlResolver = (mediaId: string) => string | undefined

interface TransitionCarryState {
  outgoingClipId: string
  incomingClipId: string
  boundaryTime: number
}

const activeManagers = new Set<VideoBufferManager>()

function seekEl(el: HTMLVideoElement, time: number): void {
  if (typeof el.fastSeek === "function") {
    el.fastSeek(time)
  } else {
    el.currentTime = time
  }
}

function findVideoClipById(tracks: Track[], clipId: string): VideoClip | null {
  for (const track of tracks) {
    if (track.type !== "video") continue
    for (const clip of track.clips) {
      if (clip.type === "video" && clip.id === clipId) return clip
    }
  }
  return null
}

/**
 * Manages a double-buffered pair of `<video>` elements.
 *
 * One element plays the active clip while the other preloads the next clip.
 * Buffer swaps are gated on `canplay` to prevent micro-freezes.
 */
export class VideoBufferManager {
  private elA: HTMLVideoElement
  private elB: HTMLVideoElement
  private activeBuffer: "A" | "B" = "A"

  state: BufferState = {
    activeClipId: null,
    activeMediaId: null,
    bufferedClipId: null,
    bufferedMediaId: null,
  }
  private bufferReady = false
  swapPending = false
  private swapGen = 0
  private transitionCarry: TransitionCarryState | null = null
  private transitionCleanupTimeout: ReturnType<typeof setTimeout> | null = null
  private clipPlayStartPh = new Map<string, number>()
  clipSeekDone: string | null = null

  constructor(elA: HTMLVideoElement, elB: HTMLVideoElement) {
    this.elA = elA
    this.elB = elB
    activeManagers.add(this)
    // Always muted — audio is driven through the audio element pool
    this.elA.muted = true
    this.elB.muted = true
  }

  getActiveEl(): HTMLVideoElement {
    return this.activeBuffer === "A" ? this.elA : this.elB
  }

  private getBufferEl(): HTMLVideoElement {
    return this.activeBuffer === "A" ? this.elB : this.elA
  }

  /** Load the first clip into the active buffer. */
  initialize(clip: VideoClip, getUrl: UrlResolver): void {
    const el = this.getActiveEl()
    const url = getUrl(clip.mediaId)
    if (!url) return
    el.src = url
    el.playbackRate = clip.speed ?? DEFAULT_SPEED
    seekEl(el, clip.mediaStart)
    applyTransformToEl(el, clip.transform)
    applyColorAdjustmentsToEl(el, clip.colorAdjustments)
    el.style.opacity = "1"
    this.getBufferEl().style.opacity = "0"
    this.state = {
      activeClipId: clip.id,
      activeMediaId: clip.mediaId,
      bufferedClipId: null,
      bufferedMediaId: null,
    }
    this.clipSeekDone = clip.id
  }

  // Buffer preparation 

  private prepareBuffer(ph: number, activeClip: VideoClip, tracks: Track[], getUrl: UrlResolver): void {
    const remaining = activeClip.timelineEnd - ph
    if (remaining > PRELOAD_LOOKAHEAD_MS / 1000) return

    const bufferEl = this.getBufferEl()
    const nextClip = getNextVideoClip(tracks, activeClip)
    if (!nextClip) return
    if (this.state.bufferedClipId === nextClip.id) return

    this.bufferReady = false
    const targetSrc = getUrl(nextClip.mediaId) ?? ""
    if (targetSrc && bufferEl.src !== targetSrc) {
      bufferEl.src = targetSrc
      this.state.bufferedMediaId = nextClip.mediaId
    }
    bufferEl.playbackRate = nextClip.speed ?? DEFAULT_SPEED
    const PREROLL = 0.03
    seekEl(bufferEl, Math.max(0, nextClip.mediaStart - PREROLL))
    bufferEl.pause()
    this.state.bufferedClipId = nextClip.id

    bufferEl.addEventListener("canplay", () => { this.bufferReady = true }, { once: true })
    if (bufferEl.readyState >= 3) this.bufferReady = true
  }

  //Buffer swap


  private swapBuffers(
    nextClip: VideoClip,
    ph: number,
    getUrl: UrlResolver,
    getIsPlaying: () => boolean,
    transition: TransitionSwapMetadata | undefined,
  ): void {
    const outgoingEl = this.getActiveEl()
    const incomingEl = this.getBufferEl()
    const targetSrc = getUrl(nextClip.mediaId) ?? ""
    if (!targetSrc) return

    const wasPrebuffered = this.state.bufferedClipId === nextClip.id
    const gen = ++this.swapGen

    if (incomingEl.src !== targetSrc) {
      incomingEl.src = targetSrc
      this.state.bufferedMediaId = nextClip.mediaId
    }
    const clipSpeed = nextClip.speed ?? DEFAULT_SPEED
    incomingEl.playbackRate = clipSpeed

    const inTransitionWindow = !!transition && transition.duration > CLIP_EPSILON && ph + CLIP_EPSILON < nextClip.timelineStart

    // For transition carry, force exact clip start to avoid showing preroll frame.
    if (inTransitionWindow) {
      seekEl(incomingEl, nextClip.mediaStart)
    } else if (!wasPrebuffered) {
      // Skip seek when prebuffered outside transitions — decoder is already positioned.
      const mediaTime = nextClip.mediaStart + (ph - nextClip.timelineStart) * clipSpeed
      seekEl(incomingEl, Math.max(nextClip.mediaStart, mediaTime))
    }

    applyTransformToEl(incomingEl, nextClip.transform)
    applyColorAdjustmentsToEl(incomingEl, nextClip.colorAdjustments)

    const doSwap = () => {
      if (this.swapGen !== gen) return
      const outgoingClipId = this.state.activeClipId
      outgoingEl.pause()
      this.transitionCleanupTimeout = runTransitionApproximation({
        outgoingEl,
        incomingEl,
        nextClip,
        transition,
        existingCleanupTimeout: this.transitionCleanupTimeout,
      })
      if (getIsPlaying()) {
        incomingEl.play().catch(() => { })
      }
      this.activeBuffer = this.activeBuffer === "A" ? "B" : "A"
      this.clipPlayStartPh.set(nextClip.id, ph)
      if (outgoingClipId) this.clipPlayStartPh.delete(outgoingClipId)
      this.state.activeClipId = nextClip.id
      this.state.activeMediaId = nextClip.mediaId
      this.state.bufferedClipId = null
      this.state.bufferedMediaId = null
      this.bufferReady = false
      this.swapPending = false

      if (transition) {
        this.transitionCarry = {
          outgoingClipId: outgoingClipId ?? nextClip.id,
          incomingClipId: nextClip.id,
          boundaryTime: nextClip.timelineStart,
        }
      } else {
        this.transitionCarry = null
      }
    }

    if (this.bufferReady || incomingEl.readyState >= 3) {
      doSwap()
    } else {
      this.swapPending = true
      incomingEl.addEventListener("canplay", doSwap, { once: true })
    }
  }

  //Per-frame sync (called from RAF)

  /**
   * Computes the opacity for fade-in from black (transitionIn without previous clip).
   * Returns 1 when no fade-in applies.
   */
  private getFadeInOpacity(ph: number, transitionIn: ResolvedTransition | undefined): number {
    if (!transitionIn || transitionIn.kind !== "fade_from_black" || transitionIn.duration <= CLIP_EPSILON) return 1
    const elapsed = ph - transitionIn.overlapStartS
    if (elapsed < 0) return 0
    if (elapsed >= transitionIn.duration) return 1
    return Math.min(1, Math.max(0, elapsed / transitionIn.duration))
  }

  /**
   * Computes the opacity for fade-out to black (transitionOut without next clip).
   * Returns 1 when no fade-out applies.
   */
  private getFadeOutOpacity(ph: number, transitionOut: ResolvedTransition | undefined): number {
    if (!transitionOut || transitionOut.kind !== "fade_to_black" || transitionOut.duration <= CLIP_EPSILON) return 1
    const fadeStart = transitionOut.overlapStartS
    if (ph < fadeStart) return 1
    const progress = (ph - fadeStart) / transitionOut.duration
    return 1 - Math.min(1, Math.max(0, progress))
  }

  syncVideo(
    ph: number,
    tracks: Track[],
    getUrl: UrlResolver,
    getIsPlaying: () => boolean,
    activeOutgoingTransition?: ClipTransition,
    transitionInByClipId?: Map<string, ResolvedTransition>,
    transitionOutByClipId?: Map<string, ResolvedTransition>,
  ): void {
    const playing = getIsPlaying()
    const timelineActiveClip = getActiveVideoClip(tracks, ph)

    if (
      this.transitionCarry &&
      ph >= this.transitionCarry.boundaryTime + CLIP_EPSILON
    ) {
      this.transitionCarry = null
    }

    const carry = this.transitionCarry
    const carryApplies =
      !!carry &&
      !!timelineActiveClip &&
      timelineActiveClip.id === carry.outgoingClipId &&
      this.state.activeClipId === carry.incomingClipId &&
      ph < carry.boundaryTime + CLIP_EPSILON

    const playbackClip = carryApplies && carry
      ? findVideoClipById(tracks, carry.incomingClipId)
      : timelineActiveClip

    if (timelineActiveClip) {
      if (
        playing &&
        !this.swapPending &&
        timelineActiveClip.id === this.state.activeClipId &&
        activeOutgoingTransition &&
        activeOutgoingTransition.duration > CLIP_EPSILON
      ) {
        const transitionStart = timelineActiveClip.timelineEnd - activeOutgoingTransition.duration
        if (ph >= transitionStart - CLIP_EPSILON) {
          const nextClip = getNextVideoClip(tracks, timelineActiveClip)
          if (nextClip && nextClip.id !== timelineActiveClip.id) {
            this.swapBuffers(nextClip, ph, getUrl, getIsPlaying, {
              type: activeOutgoingTransition.type,
              duration: activeOutgoingTransition.duration,
            })
            this.clipSeekDone = nextClip.id
          }
        }
      }

      const isTransitioning =
        activeOutgoingTransition &&
        activeOutgoingTransition.duration > CLIP_EPSILON &&
        ph >= (timelineActiveClip.timelineEnd - activeOutgoingTransition.duration - CLIP_EPSILON)


      if (
        timelineActiveClip.id !== this.state.activeClipId &&
        !this.swapPending &&
        !carryApplies &&
        !isTransitioning // <-- prevent overwrite
      ) {
        this.swapBuffers(timelineActiveClip, ph, getUrl, getIsPlaying, undefined)
        this.clipSeekDone = timelineActiveClip.id
      } else if (playing) {
        if (!playbackClip) return
        const clipSpeed = playbackClip.speed ?? DEFAULT_SPEED
        const activeEl = this.getActiveEl()
        activeEl.playbackRate = clipSpeed
        const clipStartPh = this.clipPlayStartPh.get(playbackClip.id) ?? playbackClip.timelineStart
        const playbackTransitionIn = transitionInByClipId?.get(playbackClip.id)
        const playbackTransitionOut = transitionOutByClipId?.get(playbackClip.id)

        // Apply fade-in/out opacity for non-crossfade transitions
        const fadeIn = this.getFadeInOpacity(ph, playbackTransitionIn)
        const fadeOut = this.getFadeOutOpacity(ph, playbackTransitionOut)
        const combinedOpacity = Math.min(fadeIn, fadeOut)
        if (combinedOpacity < 1) {
          activeEl.style.opacity = String(combinedOpacity)
        } else if (!this.transitionCarry) {
          activeEl.style.opacity = "1"
        }

        if (this.clipSeekDone !== playbackClip.id) {
          this.clipSeekDone = playbackClip.id
          const mediaTime = playbackClip.mediaStart + (ph - clipStartPh) * clipSpeed
          seekEl(activeEl, Math.max(playbackClip.mediaStart, mediaTime))
        } else {
          const expected = Math.max(
            playbackClip.mediaStart,
            playbackClip.mediaStart + (ph - clipStartPh) * clipSpeed,
          )
          if (Math.abs(activeEl.currentTime - expected) > DRIFT_CORRECTION_THRESHOLD_S) {
            seekEl(activeEl, expected)
          }
        }
        this.prepareBuffer(ph, timelineActiveClip, tracks, getUrl)
      } else {
        // Paused / scrubbing — always sync exactly
        const el = this.getActiveEl()
        const clipSpeed = timelineActiveClip.speed ?? DEFAULT_SPEED
        el.playbackRate = clipSpeed
        el.currentTime = timelineActiveClip.mediaStart + (ph - timelineActiveClip.timelineStart) * clipSpeed
        applyTransformToEl(el, timelineActiveClip.transform)
        applyColorAdjustmentsToEl(el, timelineActiveClip.colorAdjustments)
        const activeTransitionIn = transitionInByClipId?.get(timelineActiveClip.id)
        const activeTransitionOut = transitionOutByClipId?.get(timelineActiveClip.id)

        // Show fade-in/out opacity even when paused/scrubbing
        const fadeIn = this.getFadeInOpacity(ph, activeTransitionIn)
        const fadeOut = this.getFadeOutOpacity(ph, activeTransitionOut)
        el.style.opacity = String(Math.min(fadeIn, fadeOut))

        this.clipSeekDone = null
      }
    } else if (this.state.activeClipId !== null) {
      this.getActiveEl().pause()
      this.getActiveEl().style.opacity = "0"
      this.state.activeClipId = null
      this.state.activeMediaId = null
      this.clipSeekDone = null
      this.swapPending = false
    }
  }

  //Controls

  resetSeekFlags(): void {
    this.clipSeekDone = null
    this.swapPending = false
    this.transitionCarry = null
    this.clipPlayStartPh.clear()
  }

  setVolume(_muted: boolean, _vol: number): void {
    // Audio is routed through the dedicated audio element pool in useMediaSync.
    // Video elements are always muted to prevent duplicate audio output.
    this.elA.muted = true
    this.elB.muted = true
  }

  playActive(): void {
    if (this.state.activeClipId) this.getActiveEl().play().catch(() => { })
  }

  pauseActive(): void {
    if (this.state.activeClipId) this.getActiveEl().pause()
  }

  releaseBuffers(): void {
    if (this.transitionCleanupTimeout) {
      clearTimeout(this.transitionCleanupTimeout)
      this.transitionCleanupTimeout = null
    }
    this.elA.pause()
    this.elB.pause()
    this.elA.removeAttribute("src")
    this.elB.removeAttribute("src")
    this.elA.load()
    this.elB.load()
    this.elA.style.opacity = "0"
    this.elB.style.opacity = "0"
    this.state = {
      activeClipId: null,
      activeMediaId: null,
      bufferedClipId: null,
      bufferedMediaId: null,
    }
    this.clipSeekDone = null
    this.swapPending = false
    this.transitionCarry = null
    this.clipPlayStartPh.clear()
  }
}

export function releaseAllBuffers(): void {
  for (const manager of activeManagers) {
    manager.releaseBuffers()
  }
}
