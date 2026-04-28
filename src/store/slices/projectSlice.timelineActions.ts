import type { StateCreator } from "zustand"
import { generateId } from "../../utils/id"
import { getInsertionIndex } from "../../utils/tracks"
import { getMediaBackedClipMaxTimelineEnd, toMs, toSeconds } from "../../utils/time"
import { DEFAULT_AUDIO_CONFIG } from "../../constants/audioConfig"
import { DEFAULT_SPEED, MAX_SPEED, MIN_SPEED } from "../../constants/speed"
import { resetPlayer } from "../../hooks/usePlayer"
import { ensureCanonicalTransitionEdges } from "../../project/transitionEdges"
import type {
  Clip,
  Track,
} from "../../project/projectTypes"
import type { EditorStore } from "../editorStore"
import type { ProjectTimelineActions } from "./projectSlice.types"
import {
  applyTrackRippleForEndChange,
  deepClone,
  findClipById,
} from "./projectSlice.helpers"

export const createProjectTimelineActions: StateCreator<EditorStore, [], [], ProjectTimelineActions> = (set, get) => ({
  addClip(clip) {
    get().pushHistory("Add clip")
    resetPlayer()
    // Initialize audioConfig for video and audio clips if not already set.
    const prepared: Clip = (() => {
      if (clip.type === "video" || clip.type === "audio") {
        const clampedSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, clip.speed ?? DEFAULT_SPEED))
        return {
          ...clip,
          speed: clampedSpeed,
          audioConfig: clip.audioConfig ?? { ...DEFAULT_AUDIO_CONFIG },
        }
      }
      return clip
    })()
    set(state => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map(track =>
          track.id === clip.trackId
            ? { ...track, clips: [...track.clips, prepared] }
            : track
        ),
      },
    }))
  },

  removeClip(clipId) {
    get().pushHistory("Remove clip")
    resetPlayer()
    set(state => ({
      selectedClipId: state.selectedClipId === clipId ? undefined : state.selectedClipId,
      selectedClipIds: state.selectedClipIds.filter(id => id !== clipId),
      activeGroupId: state.activeGroupId,
      project: {
        ...state.project,
        tracks: state.project.tracks.map(track => ({
          ...track,
          clips: track.clips.filter(c => c.id !== clipId),
        })),
        clipGroups: (state.project.clipGroups ?? [])
          .map(group => ({
            ...group,
            memberClipIds: group.memberClipIds.filter(id => id !== clipId),
          }))
          .filter(group => group.memberClipIds.length > 1),
        transitionEdges: (state.project.transitionEdges ?? []).filter(
          edge => edge.clipAId !== clipId && edge.clipBId !== clipId,
        ),
      },
    }))
  },

  moveClip(clipId, newStart, trackId) {
    get().pushHistory("Move clip")
    resetPlayer()
    set(state => {
      let targetClip: Clip | undefined

      // Find and remove the clip from its current track.
      const tracksWithout = state.project.tracks.map(track => {
        const clip = track.clips.find(c => c.id === clipId)
        if (clip) {
          targetClip = clip
          return { ...track, clips: track.clips.filter(c => c.id !== clipId) }
        }
        return track
      })

      if (!targetClip) return state

      const roundedStart = toSeconds(toMs(newStart))
      const duration = targetClip.timelineEnd - targetClip.timelineStart
      const updatedClip: Clip = {
        ...targetClip,
        trackId,
        timelineStart: roundedStart,
        timelineEnd: toSeconds(toMs(roundedStart + duration)),
      }

      const updatedProject = {
        ...state.project,
        tracks: tracksWithout.map(track =>
          track.id === trackId
            ? { ...track, clips: [...track.clips, updatedClip] }
            : track
        ),
      }

      return {
        project: ensureCanonicalTransitionEdges(updatedProject).project,
      }
    })
  },

  moveClipsBatch(moves) {
    if (moves.length === 0) return
    get().pushHistory("Move clips")
    resetPlayer()
    const moveMap = new Map(moves.map(move => [move.clipId, move]))

    set(state => {
      const movedClipIds = new Set(moveMap.keys())
      const movedOriginal = new Map<string, Clip>()

      const tracksWithoutMoved = state.project.tracks.map(track => ({
        ...track,
        clips: track.clips.filter(clip => {
          if (!movedClipIds.has(clip.id)) return true
          movedOriginal.set(clip.id, clip)
          return false
        }),
      }))

      const movedClipsByTrack = new Map<string, Clip[]>()
      for (const move of moves) {
        const source = movedOriginal.get(move.clipId)
        if (!source) continue
        const roundedStart = toSeconds(toMs(move.newStart))
        const duration = source.timelineEnd - source.timelineStart
        const updated: Clip = {
          ...source,
          trackId: move.trackId,
          timelineStart: roundedStart,
          timelineEnd: toSeconds(toMs(roundedStart + duration)),
        }
        const list = movedClipsByTrack.get(move.trackId)
        if (list) list.push(updated)
        else movedClipsByTrack.set(move.trackId, [updated])
      }

      const updatedProject = {
        ...state.project,
        tracks: tracksWithoutMoved.map(track => ({
          ...track,
          clips: [...track.clips, ...(movedClipsByTrack.get(track.id) ?? [])],
        })),
      }

      return {
        project: ensureCanonicalTransitionEdges(updatedProject).project,
      }
    })
  },

  addTrack(type) {
    get().pushHistory("Add track")
    const sorted = get().project.tracks.slice().sort((a, b) => a.order - b.order)
    const insertIdx = getInsertionIndex(sorted, type)
    const newTrack: Track = {
      id: generateId(),
      type,
      order: insertIdx,
      clips: [],
    }
    // Insert at correct position and reassign all order values.
    const withNew = [
      ...sorted.slice(0, insertIdx),
      newTrack,
      ...sorted.slice(insertIdx),
    ].map((t, i) => ({ ...t, order: i }))
    set(state => ({
      project: {
        ...state.project,
        tracks: withNew,
      },
    }))
    return withNew[insertIdx]
  },

  removeTrack(trackId) {
    const { project } = get()
    const track = project.tracks.find(t => t.id === trackId)
    if (!track) return
    const sameType = project.tracks.filter(t => t.type === track.type)
    if (sameType.length <= 1) return
    get().pushHistory("Remove track")
    set(state => ({
      ...(state.selectedClipId && state.project.tracks.find(t => t.id === trackId)?.clips.some(c => c.id === state.selectedClipId)
        ? { selectedClipId: undefined }
        : {}),
      selectedClipIds: state.selectedClipIds.filter(id => !(state.project.tracks.find(t => t.id === trackId)?.clips.some(c => c.id === id))),
      project: {
        ...state.project,
        tracks: state.project.tracks.filter(t => t.id !== trackId),
        clipGroups: (state.project.clipGroups ?? [])
          .map(group => ({
            ...group,
            memberClipIds: group.memberClipIds.filter(id => !(state.project.tracks.find(t => t.id === trackId)?.clips.some(c => c.id === id))),
          }))
          .filter(group => group.memberClipIds.length > 1),
        transitionEdges: (state.project.transitionEdges ?? []).filter(
          edge => edge.trackId !== trackId,
        ),
      },
    }))
  },

  reorderTrack(sourceTrackId, targetTrackId) {
    get().pushHistory("Reorder track")
    set(state => {
      const tracks = state.project.tracks
      const source = tracks.find(t => t.id === sourceTrackId)
      const target = tracks.find(t => t.id === targetTrackId)
      if (!source || !target) return state
      const sourceOrder = source.order
      const targetOrder = target.order
      const reordered = tracks.map(t => {
        if (t.id === sourceTrackId) return { ...t, order: targetOrder }
        if (t.id === targetTrackId) return { ...t, order: sourceOrder }
        return t
      })
      return { project: { ...state.project, tracks: reordered.sort((a, b) => a.order - b.order) } }
    })
  },

  resizeClip(clipId, newEnd) {
    resetPlayer()
    set(state => {
      let didUpdate = false

      const nextTracks = state.project.tracks.map(track => {
        const target = track.clips.find(clip => clip.id === clipId)
        if (!target) return track

        const minEnd = target.timelineStart + 0.5
        const maxEnd = getMediaBackedClipMaxTimelineEnd(target) ?? Number.POSITIVE_INFINITY
        const clampedEnd = Math.max(minEnd, Math.min(newEnd, maxEnd))
        const nextTrack = applyTrackRippleForEndChange(track, clipId, clampedEnd)
        if (nextTrack !== track) didUpdate = true
        return nextTrack
      })

      if (!didUpdate) return state

      const updatedProject = {
        ...state.project,
        tracks: nextTracks,
      }

      return {
        project: ensureCanonicalTransitionEdges(updatedProject).project,
      }
    })
  },

  extractAudioFromClip(clipId) {
    const state = get()
    const sourceClip = findClipById(state.project.tracks, clipId)
    if (!sourceClip || sourceClip.type !== "video") return

    const fallbackTrack = state.project.tracks.find(t => t.type === "audio") ?? get().addTrack("audio")

    // Check for collision before extracting
    const hasOverlap = fallbackTrack.clips.some(
      clip =>
        sourceClip.timelineStart < clip.timelineEnd &&
        sourceClip.timelineEnd > clip.timelineStart,
    )
    if (hasOverlap) {
      // Optionally: could show a toast/alert here, or place on a different track
      console.warn("Cannot extract audio: overlapping clip exists on audio track")
      return
    }

    const newClip: Clip = {
      id: generateId(),
      type: "audio",
      mediaId: sourceClip.mediaId,
      trackId: fallbackTrack.id,
      timelineStart: sourceClip.timelineStart,
      timelineEnd: sourceClip.timelineEnd,
      mediaStart: sourceClip.mediaStart,
      mediaEnd: sourceClip.mediaEnd,
      volume: sourceClip.volume,
      speed: sourceClip.speed ?? DEFAULT_SPEED,
      audioConfig: { ...(sourceClip.audioConfig ?? DEFAULT_AUDIO_CONFIG) },
    }

    const mutedSourceAudioConfig = {
      ...(sourceClip.audioConfig ?? DEFAULT_AUDIO_CONFIG),
      muted: true,
    }

    set(curr => ({
      project: {
        ...curr.project,
        tracks: curr.project.tracks.map(track =>
          track.id === sourceClip.trackId
            ? {
              ...track,
              clips: track.clips.map(clip =>
                clip.id === sourceClip.id
                  ? { ...clip, audioConfig: mutedSourceAudioConfig }
                  : clip,
              ),
            }
            : track.id === fallbackTrack.id
              ? { ...track, clips: [...track.clips, newClip] }
              : track,
        ),
      },
    }))
    get().pushHistory("Extract audio")
    resetPlayer()
  },

  splitClip(clipId, time) {
    set(state => {
      let clip: Clip | undefined
      for (const track of state.project.tracks) {
        clip = track.clips.find(c => c.id === clipId)
        if (clip) break
      }

      if (!clip) return state
      if (time <= clip.timelineStart || time >= clip.timelineEnd) return state

      get().pushHistory("Split clip")

      // Round cut time to nearest ms - both halves share the exact same value,
      // guaranteeing clipA.timelineEnd === clipB.timelineStart with no float gap.
      const cutTime = toSeconds(toMs(time))
      const splitPoint = cutTime - clip.timelineStart

      const firstHalf: Clip = {
        ...deepClone(clip),
        id: generateId(),
        timelineEnd: cutTime,
        // Adjust mediaEnd for media-backed clips.
        ...("mediaEnd" in clip ? { mediaEnd: toSeconds(toMs(clip.mediaStart + splitPoint)) } : {}),
      } as Clip

      const secondHalf: Clip = {
        ...deepClone(clip),
        id: generateId(),
        timelineStart: cutTime,
        // Adjust mediaStart for media-backed clips.
        ...("mediaStart" in clip ? { mediaStart: toSeconds(toMs(clip.mediaStart + splitPoint)) } : {}),
      } as Clip

      return {
        project: {
          ...state.project,
          clipGroups: (state.project.clipGroups ?? [])
            .map(group => {
              if (!group.memberClipIds.includes(clipId)) return group
              const memberClipIds = group.memberClipIds.flatMap(id => {
                if (id !== clipId) return [id]
                return [firstHalf.id, secondHalf.id]
              })
              return { ...group, memberClipIds }
            })
            .filter(group => group.memberClipIds.length > 1),
          tracks: state.project.tracks.map(track => {
            if (!track.clips.find(c => c.id === clipId)) return track
            const filtered = track.clips.filter(c => c.id !== clipId)
            return { ...track, clips: [...filtered, firstHalf, secondHalf] }
          }),
        },
      }
    })
  },
})