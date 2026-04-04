import type { StateCreator } from "zustand"
import { generateId } from "../../utils/id"
import { getMediaBackedClipMaxTimelineEnd, toMs, toSeconds } from "../../utils/time"
import { getInsertionIndex } from "../../utils/tracks"
import { DEFAULT_AUDIO_CONFIG } from "../../constants/audioConfig"
import { DEFAULT_SPEED, MAX_SPEED, MIN_SPEED } from "../../constants/speed"
import { renderSingleFrame, resetPlayer, resumePlayer } from "../../hooks/usePlayer"
import { hashFile } from "../../utils/fileHash"
import { getFileFromCache } from "../../services/fileCacheService"
import { generateProxy } from "../../engine/proxyEngine"
import { applyCanonicalTransitionEdit, ensureCanonicalTransitionEdges } from "../../project/transitionEdges"
import type {
  AudioConfig,
  Clip,
  ClipTransition,
  ColorAdjustments,
  Media,
  MediaType,
  Project,
  TextStyle,
  Track,
  TrackType,
  Transform,
} from "../../project/projectTypes"
import type { EditorStore } from "../editorStore"

// Module-level file registry. Not part of reactive Zustand state — Map mutations
// don't trigger re-renders, but PreviewPlayer reads it after project.media updates.
export const fileMap = new Map<string, File>()

export interface ProjectSlice {
  project: Project
  missingMediaIds: Set<string>
  idbResolvedMediaIds: Set<string>
  addMedia: (file: File) => Promise<Media>
  addClip: (clip: Clip) => void
  removeClip: (clipId: string) => void
  moveClip: (clipId: string, newStart: number, trackId: string) => void
  splitClip: (clipId: string, time: number) => void
  addTrack: (type: TrackType) => Track
  removeTrack: (trackId: string) => void
  reorderTrack: (sourceTrackId: string, targetTrackId: string) => void
  resizeClip: (clipId: string, newEnd: number) => void
  updateClipTransform: (clipId: string, transform: Partial<Transform>) => void
  commitTransform: (clipId: string) => void
  updateClipColorAdjustments: (clipId: string, adjustments: ColorAdjustments) => void
  updateClipAudioConfig: (clipId: string, config: Partial<AudioConfig>) => void
  setClipTransitionIn: (clipId: string, transition: ClipTransition | undefined) => void
  setClipTransitionOut: (clipId: string, transition: ClipTransition | undefined) => void
  setClipSpeed: (clipId: string, speed: number) => void
  updateTextClip: (clipId: string, updates: { content?: string; style?: Partial<TextStyle> }) => void
  extractAudioFromClip: (clipId: string) => void
  removeMedia: (mediaId: string) => void
  setMissingMediaIds: (ids: Set<string>) => void
  loadProject: (project: Project) => Promise<void>
  resetProject: () => void
}

function makeInitialProject(): Project {
  return {
    id: generateId(),
    name: "Untitled Project",
    media: [],
    tracks: [
      { id: generateId(), type: "video", order: 0, clips: [] },
      { id: generateId(), type: "audio", order: 1, clips: [] },
    ],
  }
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function getMediaDuration(file: File, type: MediaType): Promise<number | null> {
  if (type === "image") return Promise.resolve(null)

  return new Promise((resolve) => {
    const element =
      type === "video"
        ? document.createElement("video")
        : document.createElement("audio")
    const url = URL.createObjectURL(file)
    element.src = url
    element.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(element.duration)
    }
    element.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
  })
}

const AUDIO_EXTENSIONS = new Set(["wav", "mp3", "ogg", "flac", "m4a", "aac", "opus"])
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "avi", "mkv", "m4v"])

function detectMediaType(file: File): MediaType {
  if (file.type.startsWith("video/")) return "video"
  if (file.type.startsWith("audio/")) return "audio"
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (AUDIO_EXTENSIONS.has(ext)) return "audio"
  if (VIDEO_EXTENSIONS.has(ext)) return "video"
  return "image"
}

function findClipById(tracks: Track[], clipId: string): Clip | undefined {
  for (const track of tracks) {
    const clip = track.clips.find(c => c.id === clipId)
    if (clip) return clip
  }
  return undefined
}

function normalizeTimelineValue(value: number): number {
  return toSeconds(toMs(value))
}

function applyTrackRippleForEndChange(track: Track, clipId: string, requestedEnd: number): Track {
  const targetClip = track.clips.find(clip => clip.id === clipId)
  if (!targetClip) return track

  const normalizedRequestedEnd = normalizeTimelineValue(requestedEnd)
  const targetCurrentEnd = normalizeTimelineValue(targetClip.timelineEnd)
  if (normalizedRequestedEnd === targetCurrentEnd) return track

  const nextById = new Map<string, Clip>()
  nextById.set(clipId, { ...targetClip, timelineEnd: normalizedRequestedEnd })

  if (normalizedRequestedEnd <= targetCurrentEnd) {
    return {
      ...track,
      clips: track.clips.map(clip => nextById.get(clip.id) ?? clip),
    }
  }

  const downstream = track.clips
    .filter(clip => clip.id !== clipId && clip.timelineStart >= targetClip.timelineStart)
    .slice()
    .sort((a, b) => {
      const startDiff = a.timelineStart - b.timelineStart
      if (Math.abs(startDiff) > Number.EPSILON) return startDiff
      return a.id.localeCompare(b.id)
    })

  let requiredStart = normalizedRequestedEnd
  let cumulativeShift = 0

  for (const downstreamClip of downstream) {
    let shiftedStart = normalizeTimelineValue(downstreamClip.timelineStart + cumulativeShift)
    let shiftedEnd = normalizeTimelineValue(downstreamClip.timelineEnd + cumulativeShift)

    if (shiftedStart < requiredStart) {
      const extraShift = normalizeTimelineValue(requiredStart - shiftedStart)
      cumulativeShift = normalizeTimelineValue(cumulativeShift + extraShift)
      shiftedStart = normalizeTimelineValue(shiftedStart + extraShift)
      shiftedEnd = normalizeTimelineValue(shiftedEnd + extraShift)
    }

    nextById.set(downstreamClip.id, {
      ...downstreamClip,
      timelineStart: shiftedStart,
      timelineEnd: shiftedEnd,
    })

    requiredStart = shiftedEnd
  }

  return {
    ...track,
    clips: track.clips.map(clip => nextById.get(clip.id) ?? clip),
  }
}

export const createProjectSlice: StateCreator<EditorStore, [], [], ProjectSlice> = (set, get) => ({
  project: makeInitialProject(),
  missingMediaIds: new Set<string>(),
  idbResolvedMediaIds: new Set<string>(),

  setMissingMediaIds(ids) {
    set({ missingMediaIds: ids })
  },

  async loadProject(project) {
    fileMap.clear()
    set({
      project,
      proxyMap: {},
      history: [],
      historyIndex: -1,
      playhead: 0,
      isPlaying: false,
      selectedClipId: undefined,
      selectedTransitionClipId: undefined,
      missingMediaIds: new Set(),
      idbResolvedMediaIds: new Set(),
    })
    resetPlayer()

    const missing = new Set<string>()
    const resolved = new Set<string>()

    await Promise.all(
      project.media.map(async (m) => {
        try {
          const cached = await getFileFromCache(m.hash)
          if (cached) {
            fileMap.set(m.id, cached)
            if (m.type === "video") {
              get().setProxyState(m.id, { status: "pending", objectUrl: null })
              generateProxy(
                m.id,
                cached,
                url => get().setProxyState(m.id, { status: "ready", objectUrl: url }),
                () => get().setProxyState(m.id, { status: "error", objectUrl: null }),
              )
            }
            resolved.add(m.id)
          } else {
            missing.add(m.id)
          }
        } catch {
          missing.add(m.id)
        }
      })
    )

    set({ missingMediaIds: missing, idbResolvedMediaIds: resolved })
  },

  async addMedia(file) {
    const hash = await hashFile(file)

    const existing = get().project.media.find(m => m.hash === hash)
    if (existing) return existing

    const type = detectMediaType(file)
    const duration = await getMediaDuration(file, type)
    const format = file.type

    const media: Media = {
      id: generateId(),
      name: file.name,
      type,
      format,
      duration,
      size: file.size,
      hash,
    }

    set(state => ({
      project: {
        ...state.project,
        media: [...state.project.media, media],
      },
    }))

    fileMap.set(media.id, file)
    return media
  },

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
      project: {
        ...state.project,
        tracks: state.project.tracks.map(track => ({
          ...track,
          clips: track.clips.filter(c => c.id !== clipId),
        })),
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
      project: {
        ...state.project,
        tracks: state.project.tracks.filter(t => t.id !== trackId),
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

  commitTransform(_clipId) {
    void _clipId
    const wasPlaying = get().pushHistory("Transform clip")
    renderSingleFrame()
    // Small UX improvement: keep playback running after transform commit.
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

  extractAudioFromClip(clipId) {
    const state = get()
    const sourceClip = findClipById(state.project.tracks, clipId)
    if (!sourceClip || sourceClip.type !== "video") return

    const fallbackTrack = state.project.tracks.find(t => t.type === "audio") ?? get().addTrack("audio")

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

  removeMedia(mediaId) {
    get().pushHistory("Remove media")
    resetPlayer()
    fileMap.delete(mediaId)
    set(state => {
      const { [mediaId]: removed, ...restProxy } = state.proxyMap
      void removed
      const removedClipIds = new Set(
        state.project.tracks.flatMap(track =>
          track.clips
            .filter(c => "mediaId" in c && c.mediaId === mediaId)
            .map(c => c.id),
        ),
      )
      return {
        proxyMap: restProxy,
        project: {
          ...state.project,
          media: state.project.media.filter(m => m.id !== mediaId),
          tracks: state.project.tracks.map(track => ({
            ...track,
            clips: track.clips.filter(c => !("mediaId" in c) || c.mediaId !== mediaId),
          })),
          transitionEdges: (state.project.transitionEdges ?? []).filter(
            edge =>
              (edge.clipAId === undefined || !removedClipIds.has(edge.clipAId)) &&
              (edge.clipBId === undefined || !removedClipIds.has(edge.clipBId)),
          ),
        },
      }
    })
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

      // Round cut time to nearest ms — both halves share the exact same value,
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
          tracks: state.project.tracks.map(track => {
            if (!track.clips.find(c => c.id === clipId)) return track
            const filtered = track.clips.filter(c => c.id !== clipId)
            return { ...track, clips: [...filtered, firstHalf, secondHalf] }
          }),
        },
      }
    })
  },

  resetProject() {
    fileMap.clear()
    set({
      project: makeInitialProject(),
      proxyMap: {},
      history: [],
      historyIndex: -1,
      playhead: 0,
      isPlaying: false,
      missingMediaIds: new Set(),
      idbResolvedMediaIds: new Set(),
      selectedClipId: undefined,
      selectedTransitionClipId: undefined,
      selectedTrackId: undefined,
    })
    resetPlayer()
  },
})
