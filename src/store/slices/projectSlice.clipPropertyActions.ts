import type { StateCreator } from "zustand"
import { DEFAULT_AUDIO_CONFIG } from "../../constants/audioConfig"
import { DEFAULT_SPEED, MAX_SPEED, MIN_SPEED } from "../../constants/speed"
import { renderSingleFrame, resetPlayer, resumePlayer } from "../../hooks/usePlayer"
import { applyCanonicalTransitionEdit, ensureCanonicalTransitionEdges } from "../../project/transitionEdges"
import type { EditorStore } from "../editorStore"
import type { ProjectClipPropertyActions } from "./projectSlice.types"
import {
  applyTrackRippleForEndChange,
  normalizeTimelineValue,
} from "./projectSlice.helpers"

export const createProjectClipPropertyActions: StateCreator<EditorStore, [], [], ProjectClipPropertyActions> = (set, get) => ({
  updateClipTransform(clipId, transform) {
    set(state => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip
            if (!("transform" in clip)) return clip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return { ...clip, transform: { ...(clip as any).transform, ...transform } }
          }),
        })),
      },
    }))
    renderSingleFrame()
  },

  updateClipTransformsBatch(updates) {
    if (updates.length === 0) return
    const updateMap = new Map(updates.map(item => [item.clipId, item.transform]))
    set(state => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => {
            const patch = updateMap.get(clip.id)
            if (!patch) return clip
            if (!("transform" in clip)) return clip
            return { ...clip, transform: { ...clip.transform, ...patch } }
          }),
        })),
      },
    }))
    renderSingleFrame()
  },

  commitTransform(_clipId) {
    void _clipId
    const wasPlaying = get().pushHistory("Transform clip")
    renderSingleFrame()
    // Small UX improvement: keep playback running after transform commit.
    if (wasPlaying) resumePlayer()
  },

  commitTransformsBatch() {
    const wasPlaying = get().pushHistory("Transform clips")
    renderSingleFrame()
    if (wasPlaying) resumePlayer()
  },

  updateTextClip(clipId, updates) {
    set(state => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId || clip.type !== "text") return clip
            return {
              ...clip,
              ...(updates.content !== undefined ? { content: updates.content } : {}),
              ...(updates.style !== undefined ? { style: { ...(clip.style ?? {}), ...updates.style } } : {}),
            }
          }),
        })),
      },
    }))
    renderSingleFrame()
  },

  updateTextClipsBatch(updates) {
    if (updates.length === 0) return
    const updateMap = new Map(updates.map(item => [item.clipId, item.style]))
    set(state => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => {
            const stylePatch = updateMap.get(clip.id)
            if (!stylePatch || clip.type !== "text") return clip
            return {
              ...clip,
              style: { ...(clip.style ?? {}), ...stylePatch },
            }
          }),
        })),
      },
    }))
    renderSingleFrame()
  },

  updateClipColorAdjustments(clipId, adjustments) {
    const wasPlaying = get().pushHistory("Color adjustment")
    set(state => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip
            if (clip.type !== "video" && clip.type !== "image") return clip
            return { ...clip, colorAdjustments: adjustments }
          }),
        })),
      },
    }))
    renderSingleFrame()
    // Resume if this update paused active playback for history capture.
    if (wasPlaying) resumePlayer()
  },

  updateClipAudioConfig(clipId, config) {
    const wasPlaying = get().pushHistory("Audio config")
    set(state => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip
            if (clip.type !== "video" && clip.type !== "audio") return clip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const existing = (clip as any).audioConfig ?? { ...DEFAULT_AUDIO_CONFIG }
            return { ...clip, audioConfig: { ...existing, ...config } }
          }),
        })),
      },
    }))
    // Resume playback so audio setting changes feel live.
    if (wasPlaying) resumePlayer()
  },

  setClipTransitionIn(clipId, transition) {
    get().pushHistory(transition ? "Set transition in" : "Remove transition in")
    resetPlayer()
    set(state => {
      const withLegacyUpdated = {
        ...state.project,
        tracks: state.project.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip
            if (clip.type !== "video") return clip
            if (transition) {
              return { ...clip, transitionIn: { ...transition } }
            }
            const { transitionIn: _removed, ...rest } = clip
            void _removed
            return rest
          }),
        })),
      }

      return {
        project: applyCanonicalTransitionEdit(withLegacyUpdated, clipId, "in", transition),
      }
    })
  },

  setClipTransitionOut(clipId, transition) {
    get().pushHistory(transition ? "Set transition out" : "Remove transition out")
    resetPlayer()
    set(state => ({
      selectedTransitionClipId: !transition && state.selectedTransitionClipId === clipId
        ? undefined
        : state.selectedTransitionClipId,
      project: applyCanonicalTransitionEdit(
        {
          ...state.project,
          tracks: state.project.tracks.map(track => ({
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id !== clipId) return clip
              if (clip.type !== "video") return clip
              if (transition) {
                return { ...clip, transitionOut: { ...transition } }
              }
              const { transitionOut: _removed, ...rest } = clip
              void _removed
              return rest
            }),
          })),
        },
        clipId,
        "out",
        transition,
      ),
    }))
  },

  setClipSpeed(clipId, speed) {
    const state = get()
    const clipExists = state.project.tracks.some(track =>
      track.clips.some(c => c.id === clipId && (c.type === "video" || c.type === "audio")),
    )
    if (!clipExists) return

    const clampedSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed))

    set(curr => {
      let didUpdate = false

      const nextTracks = curr.project.tracks.map(track => {
        const targetClip = track.clips.find(c => c.id === clipId)
        if (!targetClip || (targetClip.type !== "video" && targetClip.type !== "audio")) {
          return track
        }

        const baseDuration = targetClip.mediaEnd - targetClip.mediaStart
        const computedTimelineEnd = normalizeTimelineValue(targetClip.timelineStart + (baseDuration / clampedSpeed))
        const minEnd = targetClip.timelineStart
        const clampedTimelineEnd = Math.max(minEnd, computedTimelineEnd)
        const currentSpeed = targetClip.speed ?? DEFAULT_SPEED
        const currentEnd = normalizeTimelineValue(targetClip.timelineEnd)
        if (currentSpeed === clampedSpeed && currentEnd === clampedTimelineEnd) return track

        const trackWithRipple = applyTrackRippleForEndChange(track, clipId, clampedTimelineEnd)
        const nextTrack = {
          ...trackWithRipple,
          clips: trackWithRipple.clips.map(clip => {
            if (clip.id !== clipId) return clip
            if (clip.type !== "video" && clip.type !== "audio") return clip
            return {
              ...clip,
              speed: clampedSpeed,
              timelineEnd: clampedTimelineEnd,
            }
          }),
        }
        if (nextTrack !== track) didUpdate = true
        return nextTrack
      })

      if (!didUpdate) return curr

      const updatedProject = {
        ...curr.project,
        tracks: nextTracks,
      }

      return {
        project: ensureCanonicalTransitionEdges(updatedProject).project,
      }
    })

    get().pushHistory("Set clip speed")
    resetPlayer()
  },
})