import type { StateCreator } from "zustand"
import { generateId } from "../../utils/id"
import { toMs, toSeconds } from "../../utils/time"
import { getInsertionIndex } from "../../utils/tracks"
import { DEFAULT_AUDIO_CONFIG } from "../../constants/audioConfig"
import { DEFAULT_SPEED, MAX_SPEED, MIN_SPEED } from "../../constants/speed"
import { renderSingleFrame, resetPlayer, resumePlayer } from "../../hooks/usePlayer"
import { hashFile } from "../../utils/fileHash"
import { getFileFromCache } from "../../services/fileCacheService"
import { generateProxy } from "../../engine/proxyEngine"
import type {
  AudioConfig,
  Clip,
  ColorAdjustments,
  Media,
  MediaType,
  Project,
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
  setClipSpeed: (clipId: string, speed: number) => void
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

function detectMediaType(file: File): MediaType {
  if (file.type.startsWith("video/")) return "video"
  if (file.type.startsWith("audio/")) return "audio"
  return "image"
}

function findClipById(tracks: Track[], clipId: string): Clip | undefined {
  for (const track of tracks) {
    const clip = track.clips.find(c => c.id === clipId)
    if (clip) return clip
  }
  return undefined
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

      return {
        project: {
          ...state.project,
          tracks: tracksWithout.map(track =>
            track.id === trackId
              ? { ...track, clips: [...track.clips, updatedClip] }
              : track
          ),
        },
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
    set(state => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip
            if (newEnd <= clip.timelineStart + 0.5) return clip
            return { ...clip, timelineEnd: newEnd }
          }),
        })),
      },
    }))
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
    const wasPlaying = get().pushHistory("Transform clip")
    renderSingleFrame()
    // Small UX improvement: keep playback running after transform commit.
    if (wasPlaying) resumePlayer()
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

  setClipSpeed(clipId, speed) {
    const state = get()
    const clipExists = state.project.tracks.some(track =>
      track.clips.some(c => c.id === clipId && (c.type === "video" || c.type === "audio")),
    )
    if (!clipExists) return

    const clampedSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed))

    set(curr => ({
      project: {
        ...curr.project,
        tracks: curr.project.tracks.map(track => {
          const targetClip = track.clips.find(c => c.id === clipId)
          if (!targetClip || (targetClip.type !== "video" && targetClip.type !== "audio")) {
            return track
          }

          const baseDuration = targetClip.mediaEnd - targetClip.mediaStart
          const computedTimelineEnd = toSeconds(toMs(targetClip.timelineStart + (baseDuration / clampedSpeed)))
          const nextTimelineStart = track.clips
            .filter(c => c.id !== clipId && c.timelineStart >= targetClip.timelineStart)
            .reduce<number | null>((next, c) => {
              if (next == null) return c.timelineStart
              return Math.min(next, c.timelineStart)
            }, null)

          const maxEnd = nextTimelineStart ?? Number.POSITIVE_INFINITY
          const clampedTimelineEnd = toSeconds(
            toMs(Math.max(targetClip.timelineStart, Math.min(computedTimelineEnd, maxEnd))),
          )

          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id !== clipId) return clip
              if (clip.type !== "video" && clip.type !== "audio") return clip
              return {
                ...clip,
                speed: clampedSpeed,
                timelineEnd: clampedTimelineEnd,
              }
            }),
          }
        }),
      },
    }))

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

    set(curr => ({
      project: {
        ...curr.project,
        tracks: curr.project.tracks.map(track =>
          track.id === fallbackTrack.id
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
      const { [mediaId]: _removed, ...restProxy } = state.proxyMap
      return {
        proxyMap: restProxy,
        project: {
          ...state.project,
          media: state.project.media.filter(m => m.id !== mediaId),
          tracks: state.project.tracks.map(track => ({
            ...track,
            clips: track.clips.filter(c => !("mediaId" in c) || c.mediaId !== mediaId),
          })),
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
      selectedTrackId: undefined,
    })
    resetPlayer()
  },
})
