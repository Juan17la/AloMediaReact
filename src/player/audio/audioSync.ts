import type { AudioClip, VideoClip, AudioConfig } from "../../project/projectTypes"
import type { ClipIndex } from "../timeline/clipLookup"
import { lookupActiveClips } from "../timeline/clipLookup"
import { DRIFT_CORRECTION_THRESHOLD_S } from "../../constants/timeline"
import { DEFAULT_AUDIO_CONFIG } from "../../constants/audioConfig"
import { DEFAULT_SPEED } from "../../constants/speed"

type AudioBearingClip = AudioClip | VideoClip

// Web Audio contexts and nodes are cached per track ID so they persist across frames
const audioContexts = new Map<string, AudioContext>()
const mediaElementSources = new Map<string, MediaElementAudioSourceNode>()
const gainNodes = new Map<string, GainNode>()
const pannerNodes = new Map<string, StereoPannerNode>()

/**
 * Synchronises audio elements to the playhead. Called once per RAF frame.
 * Handles both AudioClip and VideoClip types — VideoClip audio on non-primary
 * tracks is routed through dedicated <audio> elements in the pool so it is
 * never silenced by muted secondary <video> elements.
 *
 * - Pauses audio elements whose clips are no longer active.
 * - Seeks newly-active clips to the correct media time.
 * - Applies drift correction to running clips.
 * - Applies per-clip audioConfig settings (volume, mute, balance) via Web Audio API.
 *
 * @returns The set of active audio clip IDs (pass back as `prevActiveIds` next frame).
 */
export function syncAudioElements(
  ph: number,
  playing: boolean,
  clipIndex: ClipIndex,
  audioElements: Map<string, HTMLAudioElement>,
  prevActiveIds: Set<string>,
  getObjectUrl: (mediaId: string) => string | undefined,
  isMuted = false,
  volume = 1,
): Set<string> {
  const activeAudioClips = lookupActiveClips(clipIndex, ph).filter(
    (c): c is AudioBearingClip => c.type === "audio" || c.type === "video",
  )
  const activeTrackIds = new Set(activeAudioClips.map(c => c.trackId))

  // Phase 1 batch DOM reads
  const currentTimes = new Map<string, number>()
  for (const [trackId, el] of audioElements) {
    currentTimes.set(trackId, el.currentTime)
  }

  // Phase 2 pause inactive and clean up Web Audio nodes
  for (const [trackId, el] of audioElements) {
    if (!activeTrackIds.has(trackId)) {
      el.pause()
      // Disconnect Web Audio nodes
      const ctx = audioContexts.get(trackId)
      const gainNode = gainNodes.get(trackId)
      const pannerNode = pannerNodes.get(trackId)
      if (gainNode && ctx) {
        gainNode.disconnect()
        gainNodes.delete(trackId)
      }
      if (pannerNode && ctx) {
        pannerNode.disconnect()
        pannerNodes.delete(trackId)
      }
    }
  }

  const activeIds = new Set(activeAudioClips.map(c => c.id))
  const newlyActive = new Set([...activeIds].filter(id => !prevActiveIds.has(id)))

  // Phase 3 sync active clips
  for (const clip of activeAudioClips) {
    const el = audioElements.get(clip.trackId)
    if (!el) continue
    const url = getObjectUrl(clip.mediaId)
    if (url && el.src !== url) el.src = url
    const clipSpeed = clip.speed ?? DEFAULT_SPEED
    el.playbackRate = clipSpeed
    const mediaTime = clip.mediaStart + (ph - clip.timelineStart) * clipSpeed
    const clipConfig = clip.audioConfig ?? DEFAULT_AUDIO_CONFIG

    if (newlyActive.has(clip.id)) {
      el.currentTime = Math.max(0, mediaTime)
      if (playing) {
        // Apply audio config + global settings
        applyAudioConfig(el, clipConfig, isMuted, volume, clip.trackId)
        el.play().catch(() => {})
      }
    } else if (!playing) {
      if (el.readyState >= 1) el.currentTime = mediaTime
    } else {
      const current = currentTimes.get(clip.trackId) ?? 0
      if (Math.abs(current - mediaTime) > DRIFT_CORRECTION_THRESHOLD_S) {
        el.currentTime = mediaTime
      }
      // Reapply audio config during playback (handles changes via store updates)
      applyAudioConfig(el, clipConfig, isMuted, volume, clip.trackId)
    }
  }

  return activeIds
}

/**
 * Applies audioConfig to an audio element, combining with global mute/volume.
 * Uses Web Audio API for advanced features (volume > 1.0, balance, potentially fades).
 */
function applyAudioConfig(
  el: HTMLAudioElement,
  config: AudioConfig,
  globalMute: boolean,
  globalVolume: number,
  trackId: string,
): void {
  // Determine if element is muted at all levels
  const isEffectivelyMuted = globalMute || config.muted
  el.muted = isEffectivelyMuted

  // If muted, don't bother setting up Web Audio gains
  if (isEffectivelyMuted) {
    el.volume = 0
    return
  }

  // Combine global volume with clip volume
  const combinedVolume = globalVolume * config.volume

  // For normal volumes (0-1), native element.volume is sufficient
  // For volumes > 1.0, we need Web Audio API GainNode to boost
  if (combinedVolume <= 1.0) {
    el.volume = Math.max(0, Math.min(1, combinedVolume))
    // For balance at normal volumes, we still need panner node
    if (Math.abs(config.balance) > 0.001) {
      setupPannerOnly(el, config.balance, trackId)
    } else {
      disconnectPanNode(trackId)
    }
    return
  }

  // For combinedVolume > 1.0, use Web Audio API
  setupGainNode(el, combinedVolume, config.balance, trackId)
}

/**
 * Sets up and maintains a Web Audio GainNode + PannerNode for volume boost and balance.
 */
function setupGainNode(
  el: HTMLAudioElement,
  volume: number,
  balance: number,
  trackId: string,
): void {
  let ctx = audioContexts.get(trackId)
  let source = mediaElementSources.get(trackId)
  let gainNode = gainNodes.get(trackId)
  let pannerNode = pannerNodes.get(trackId)

  // Create or resume audio context
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    audioContexts.set(trackId, ctx)
  }

  // Resume context if suspended (required by browser autoplay policy)
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {})
  }

  // Create media element source once (cannot be created twice for same element)
  if (!source) {
    try {
      const newSource = ctx.createMediaElementSource(el)
      mediaElementSources.set(trackId, newSource)
      source = newSource
    } catch (e) {
      // Source already created for this element, continue
      return
    }
  }

  // Create gain node if needed
  if (!gainNode) {
    gainNode = ctx.createGain()
    // Disconnect source from any current connection (e.g. pass-through added
    // by disconnectAll) before inserting the gain node into the chain.
    try { source.disconnect() } catch (e) {}
    source.connect(gainNode)
    gainNodes.set(trackId, gainNode)
    // Connect to destination immediately so audio is audible by default.
    gainNode.connect(ctx.destination)
  }

  // Set gain value
  gainNode.gain.setValueAtTime(Math.max(0, Math.min(2, volume)), ctx.currentTime)

  // Apply balance if needed
  if (Math.abs(balance) > 0.001) {
    if (!pannerNode) {
      pannerNode = ctx.createStereoPanner()
      
      // Disconnect old chain and rebuild with panner
      gainNode.disconnect()
      gainNode.connect(pannerNode)
      pannerNode.connect(ctx.destination)
      pannerNodes.set(trackId, pannerNode)
    }
    pannerNode.pan.setValueAtTime(Math.max(-1, Math.min(1, balance)), ctx.currentTime)
  } else {
    // No balance needed
    if (pannerNode) {
      // Disconnect panner and reconnect gain directly
      pannerNode.disconnect()
      gainNode.disconnect()
      gainNode.connect(ctx.destination)
      pannerNodes.delete(trackId)
    }
  }
}

/**
 * Sets up a stereo panner node for balance when using normal element.volume.
 * Does not use gain node, only panner connected to element's default output.
 */
function setupPannerOnly(
  el: HTMLAudioElement,
  balance: number,
  trackId: string,
): void {
  let ctx = audioContexts.get(trackId)
  let source = mediaElementSources.get(trackId)
  let pannerNode = pannerNodes.get(trackId)

  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    audioContexts.set(trackId, ctx)
  }

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {})
  }

  if (!source) {
    try {
      const newSource = ctx.createMediaElementSource(el)
      mediaElementSources.set(trackId, newSource)
      source = newSource
    } catch (e) {
      return
    }
  }

  if (!pannerNode) {
    pannerNode = ctx.createStereoPanner()
    // Disconnect source from any current connection (e.g. pass-through added
    // by disconnectAll) before inserting the panner into the chain.
    try { source.disconnect() } catch (e) {}
    source.connect(pannerNode)
    pannerNode.connect(ctx.destination)
    pannerNodes.set(trackId, pannerNode)
  }

  pannerNode.pan.setValueAtTime(Math.max(-1, Math.min(1, balance)), ctx.currentTime)
}

/**
 * Disconnects the panning node if it exists, leaving gain in place.
 */
function disconnectPanNode(trackId: string): void {
  const pannerNode = pannerNodes.get(trackId)
  const gainNode = gainNodes.get(trackId)
  if (!pannerNode || !gainNode) return
  try {
    pannerNode.disconnect()
    gainNode.disconnect()
    const ctx = audioContexts.get(trackId)
    if (ctx) {
      gainNode.connect(ctx.destination)
    }
    pannerNodes.delete(trackId)
  } catch (e) {
    // Silently ignore errors
  }
}

/**
 * Destroys all Web Audio nodes for a track and reconnects element to default output.
 */
export function destroyAudioContext(trackId: string): void {
  const gainNode = gainNodes.get(trackId)
  const pannerNode = pannerNodes.get(trackId)
  const source = mediaElementSources.get(trackId)
  try {
    if (pannerNode) {
      pannerNode.disconnect()
      pannerNodes.delete(trackId)
    }
    if (gainNode) {
      gainNode.disconnect()
      gainNodes.delete(trackId)
    }
    if (source) {
      source.disconnect()
      mediaElementSources.delete(trackId)
    }
  } catch (e) {
    // Silently ignore errors during cleanup
  }
  audioContexts.delete(trackId)
}

export function disconnectAll(): void {
  for (const trackId of [...audioContexts.keys()]) {
    const gainNode = gainNodes.get(trackId)
    const pannerNode = pannerNodes.get(trackId)
    const source = mediaElementSources.get(trackId)
    const ctx = audioContexts.get(trackId)
    try {
      if (pannerNode) pannerNode.disconnect()
      if (gainNode) gainNode.disconnect()
      // Re-attach source directly to destination so the audio element
      // produces sound at native volume while the player reinitialises.
      // audioContexts and mediaElementSources are intentionally kept alive —
      // createMediaElementSource() can only be called once per HTMLAudioElement,
      // so these must persist across resets and be reused on reconnection.
      if (source && ctx && ctx.state !== "closed") {
        source.connect(ctx.destination)
      }
    } catch (e) {}
  }
  gainNodes.clear()
  pannerNodes.clear()
}