import type { ResolvedTransition, Track, VideoClip } from "../../project/projectTypes"
import { PRELOAD_LOOKAHEAD_MS } from "../../constants/timeline"
import { getActiveVideoClip, getNextVideoClip } from "../timeline/activeClipResolver"
import { applyTransformToEl, applyColorAdjustmentsToEl } from "../render/transformUtils"
import { DEFAULT_SPEED } from "../../constants/speed"
import { CLIP_EPSILON } from "../../utils/time"
import { runTransitionApproximation, type TransitionSwapMetadata } from "./videoTransitions"
import { TransitionStateMachine } from "./transitionStateMachine"
import { BufferSwapManager } from "./bufferSwapManager"
import { PlaybackSynchronizer } from "./playbackSynchronizer"
import { seekEl } from "./videoBufferUtils"

export interface BufferState {
  activeClipId: string | null
  activeMediaId: string | null
  bufferedClipId: string | null
  bufferedMediaId: string | null
}

type UrlResolver = (mediaId: string) => string | undefined

const activeManagers = new Set<VideoBufferManager>()

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
 * Manages a double-buffered pair of <video> elements for gapless timeline playback.
 *
 * OOP Justification: This class encapsulates complex mutable state (video elements,
 * buffer swaps, transition timing, RAF-based playback sync) that cannot be reasonably
 * modeled as pure functions due to:
 *  - Side effects from HTMLVideoElement API (src, play, pause, seek, opacity)
 *  - Timing-sensitive state transitions that must be coherent within a frame
 *  - Resource lifecycle (preloading, buffer readiness events, cleanup)
 *
 * Architecture:
 *  - Uses two video elements (elA, elB) in a ping-pong buffer arrangement.
 *  - activeBuffer tracks which element currently holds the visible clip.
 *  - Composed of three helper classes:
 *    - TransitionStateMachine: handles transition carry/cleanup across clip boundaries
 *    - BufferSwapManager:      manages buffer swap atomicity and generation tracking
 *    - PlaybackSynchronizer:   tracks per-clip play start positions for accurate seeking
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
  private transitionMachine = new TransitionStateMachine()
  private swapManager = new BufferSwapManager()
  private playbackSync = new PlaybackSynchronizer()
  clipSeekDone: string | null = null

  constructor(elA: HTMLVideoElement, elB: HTMLVideoElement) {
    this.elA = elA
    this.elB = elB
    activeManagers.add(this)
    this.elA.muted = true
    this.elB.muted = true
  }

  getActiveEl(): HTMLVideoElement {
    return this.activeBuffer === "A" ? this.elA : this.elB
  }

  private getBufferEl(): HTMLVideoElement {
    return this.activeBuffer === "A" ? this.elB : this.elA
  }

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

  /**
   * Coordinates a buffer swap from the currently-active clip to nextClip.
   *
   * Flow:
   *  1. Load nextClip into the idle buffer element (if not already preloaded).
   *  2. Seek the incoming element to the correct media time:
   *     - Inside a transition window: seek to nextClip.mediaStart
   *     - Outside transition but not prebuffered: derive position from playhead
   *  3. Apply transform and color adjustments to incoming element.
   *  4. Wait for the buffer to be ready (canplay or readyState >= 3).
   *  5. Atomically swap active/inactive buffers:
   *     - Pause outgoing element and run transition approximation (fade/crossfade).
   *     - Start incoming playback if engine is playing.
   *     - Update playbackSync, transitionMachine, and swapManager state.
   *
   * The generation counter on swapManager prevents stale swaps from corrupting state
   * when seeks or clip changes happen in quick succession.
   */
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
    const gen = this.swapManager.initiateSwap(nextClip, this.swapManager.createSwapMetadata(nextClip, getUrl))

    if (incomingEl.src !== targetSrc) {
      incomingEl.src = targetSrc
      this.state.bufferedMediaId = nextClip.mediaId
    }
    const clipSpeed = nextClip.speed ?? DEFAULT_SPEED
    incomingEl.playbackRate = clipSpeed

    const inTransitionWindow = !!transition && transition.duration > CLIP_EPSILON && ph + CLIP_EPSILON < nextClip.timelineStart

    if (inTransitionWindow) {
      seekEl(incomingEl, nextClip.mediaStart)
    } else if (!wasPrebuffered) {
      const mediaTime = nextClip.mediaStart + (ph - nextClip.timelineStart) * clipSpeed
      seekEl(incomingEl, Math.max(nextClip.mediaStart, mediaTime))
    }

    applyTransformToEl(incomingEl, nextClip.transform)
    applyColorAdjustmentsToEl(incomingEl, nextClip.colorAdjustments)

    const doSwap = () => {
      if (this.swapManager.getCurrentGen() !== gen) return
      const outgoingClipId = this.state.activeClipId
      outgoingEl.pause()
      const cleanupTimeout = runTransitionApproximation({
        outgoingEl,
        incomingEl,
        nextClip,
        transition,
        existingCleanupTimeout: this.transitionMachine.getCleanupTimeout(),
      })
      this.transitionMachine.setCleanupTimeout(cleanupTimeout)
      if (getIsPlaying()) {
        incomingEl.play().catch(() => { })
      }
      this.activeBuffer = this.activeBuffer === "A" ? "B" : "A"
      this.playbackSync.recordPlayStart(nextClip.id, nextClip.timelineStart)
      if (outgoingClipId) this.playbackSync.deleteClipStartPh(outgoingClipId)
      this.state.activeClipId = nextClip.id
      this.state.activeMediaId = nextClip.mediaId
      this.state.bufferedClipId = null
      this.state.bufferedMediaId = null
      this.bufferReady = false
      this.swapManager.confirmSwap()

      if (transition) {
        this.transitionMachine.enterTransition(outgoingClipId ?? nextClip.id, nextClip.id, nextClip.timelineStart)
      } else {
        this.transitionMachine.exitTransition()
      }
    }

    if (this.bufferReady || incomingEl.readyState >= 3) {
      doSwap()
    } else {
      incomingEl.addEventListener("canplay", doSwap, { once: true })
    }
  }

  private getFadeInOpacity(ph: number, transitionIn: ResolvedTransition | undefined): number {
    if (!transitionIn || transitionIn.kind !== "fade_from_black" || transitionIn.duration <= CLIP_EPSILON) return 1
    const elapsed = ph - transitionIn.overlapStartS
    if (elapsed < 0) return 0
    if (elapsed >= transitionIn.duration) return 1
    return Math.min(1, Math.max(0, elapsed / transitionIn.duration))
  }

  private getFadeOutOpacity(ph: number, transitionOut: ResolvedTransition | undefined): number {
    if (!transitionOut || transitionOut.kind !== "fade_to_black" || transitionOut.duration <= CLIP_EPSILON) return 1
    const fadeStart = transitionOut.overlapStartS
    if (ph < fadeStart) return 1
    const progress = (ph - fadeStart) / transitionOut.duration
    return 1 - Math.min(1, Math.max(0, progress))
  }

  /**
   * Main playback sync entry point — called every RAF frame.
   *
   * Responsibilities:
   *  - Determine the active clip at the current playhead.
   *  - Handle transition carry-over: when a crossfade is in progress but the
   *    playhead lands on the incoming clip, keep rendering the old element.
   *  - Initiate buffer swaps when the active clip changes (normal or transition).
   *  - Manage per-clip opacity for fade_in/fade_out transitions.
   *  - Seek the active element when playhead position diverges from media time
   *    (e.g., after a scrub or after entering a new clip).
   *  - Preload the next clip when nearing the preload lookahead threshold.
   *
   * @param activeOutgoingTransition  Resolved transition from the clip being exited
   *                                  (used to trigger crossfade swap at the right time).
   * @param transitionInByClipId      Map of incoming clip → fade-from-black transition.
   * @param transitionOutByClipId     Map of incoming clip → fade-to-black transition.
   */
  syncVideo(
    ph: number,
    tracks: Track[],
    getUrl: UrlResolver,
    getIsPlaying: () => boolean,
    activeOutgoingTransition?: ResolvedTransition,
    transitionInByClipId?: Map<string, ResolvedTransition>,
    transitionOutByClipId?: Map<string, ResolvedTransition>,
  ): void {
    const playing = getIsPlaying()
    const timelineActiveClip = getActiveVideoClip(tracks, ph)

    this.transitionMachine.clearCarryIfExpired(ph)

    const carry = this.transitionMachine.getCarry()
    const carryApplies =
      !!carry &&
      !!timelineActiveClip &&
      timelineActiveClip.id === carry.outgoingClipId &&
      this.state.activeClipId === carry.incomingClipId &&
      this.transitionMachine.isCarryActive(ph)

    const playbackClip = carryApplies && carry
      ? findVideoClipById(tracks, carry.incomingClipId)
      : timelineActiveClip

    if (timelineActiveClip) {
      if (
        playing &&
        !this.swapManager.isSwapPending() &&
        timelineActiveClip.id === this.state.activeClipId &&
        activeOutgoingTransition &&
        activeOutgoingTransition.kind === "crossfade" &&
        activeOutgoingTransition.duration > CLIP_EPSILON
      ) {
        const transitionStart = activeOutgoingTransition.overlapStartS
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
        activeOutgoingTransition.kind === "crossfade" &&
        activeOutgoingTransition.duration > CLIP_EPSILON &&
        ph >= (activeOutgoingTransition.overlapStartS - CLIP_EPSILON)

      if (
        timelineActiveClip.id !== this.state.activeClipId &&
        !this.swapManager.isSwapPending() &&
        !carryApplies &&
        !isTransitioning
      ) {
        this.swapBuffers(timelineActiveClip, ph, getUrl, getIsPlaying, undefined)
        this.clipSeekDone = timelineActiveClip.id
      } else if (playing) {
        if (!playbackClip) return
        const clipSpeed = playbackClip.speed ?? DEFAULT_SPEED
        const activeEl = this.getActiveEl()
        activeEl.playbackRate = clipSpeed
        const playbackTransitionIn = transitionInByClipId?.get(playbackClip.id)
        const playbackTransitionOut = transitionOutByClipId?.get(playbackClip.id)

        const fadeIn = this.getFadeInOpacity(ph, playbackTransitionIn)
        const fadeOut = this.getFadeOutOpacity(ph, playbackTransitionOut)
        const combinedOpacity = Math.min(fadeIn, fadeOut)
        if (combinedOpacity < 1) {
          activeEl.style.opacity = String(combinedOpacity)
        } else if (!this.transitionMachine.getCarry()) {
          activeEl.style.opacity = "1"
        }

        if (this.clipSeekDone !== playbackClip.id) {
          this.clipSeekDone = playbackClip.id
          const mediaTime = this.playbackSync.getSeekTarget(playbackClip, ph)
          seekEl(activeEl, mediaTime)
        } else {
          if (this.playbackSync.needsSeek(playbackClip, ph, activeEl.currentTime)) {
            seekEl(activeEl, this.playbackSync.getSeekTarget(playbackClip, ph))
          }
        }
        this.prepareBuffer(ph, timelineActiveClip, tracks, getUrl)
      } else {
        const el = this.getActiveEl()
        const clipSpeed = timelineActiveClip.speed ?? DEFAULT_SPEED
        el.playbackRate = clipSpeed
        el.currentTime = timelineActiveClip.mediaStart + (ph - timelineActiveClip.timelineStart) * clipSpeed
        applyTransformToEl(el, timelineActiveClip.transform)
        applyColorAdjustmentsToEl(el, timelineActiveClip.colorAdjustments)
        const activeTransitionIn = transitionInByClipId?.get(timelineActiveClip.id)
        const activeTransitionOut = transitionOutByClipId?.get(timelineActiveClip.id)

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
      this.swapManager.cancelSwap()
    }
  }

  resetSeekFlags(): void {
    this.clipSeekDone = null
    this.swapManager.cancelSwap()
    this.transitionMachine.exitTransition()
    this.playbackSync.clear()
  }

  setVolume(_muted: boolean, _vol: number): void {
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
    const cleanupTimeout = this.transitionMachine.getCleanupTimeout()
    if (cleanupTimeout) {
      clearTimeout(cleanupTimeout)
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
    this.swapManager.cancelSwap()
    this.transitionMachine.exitTransition()
    this.playbackSync.clear()
  }
}

export function releaseAllBuffers(): void {
  for (const manager of activeManagers) {
    manager.releaseBuffers()
  }
}