import type { StateCreator } from "zustand"
import { resetPlayer } from "../../hooks/usePlayer"
import { TIMELINE_ZOOM } from "../../constants/timeline"
import { DEFAULT_AUDIO_CONFIG } from "../../constants/audioConfig"
import { DEFAULT_COLOR_ADJUSTMENTS } from "../../constants/colorAdjustments"
import { toMs, toSeconds } from "../../utils/time"
import { generateId } from "../../utils/id"
import type { Clip, TrackType } from "../../project/projectTypes"
import type { EditorStore } from "../editorStore"

export interface UiSlice {
  selectedClipId?: string
  selectedTransitionClipId?: string
  selectedTrackId?: string
  timelineScale: number
  clipboard: Clip | null
  setSelectedClip: (clipId: string | undefined) => void
  setSelectedTransitionClip: (clipId: string | undefined) => void
  setSelectedTrack: (trackId: string | undefined) => void
  setTimelineScale: (scale: number) => void
  /** Copies the currently selected clip into the clipboard. No-op if nothing is selected or the clip is a text clip. */
  copyClip: () => void
  /** Pastes the clipboard clip onto a matching track at the current playhead, resolving overlaps by appending after the last conflicting clip. */
  pasteClip: () => void
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function findClipById(tracks: EditorStore["project"]["tracks"], clipId: string): Clip | undefined {
  for (const track of tracks) {
    const clip = track.clips.find(c => c.id === clipId)
    if (clip) return clip
  }
  return undefined
}

export const createUiSlice: StateCreator<EditorStore, [], [], UiSlice> = (set, get) => ({
  selectedClipId: undefined,
  selectedTransitionClipId: undefined,
  selectedTrackId: undefined,
  timelineScale: TIMELINE_ZOOM.DEFAULT,
  clipboard: null,

  setSelectedClip(clipId) {
    set({ selectedClipId: clipId, selectedTransitionClipId: undefined })
  },

  setSelectedTransitionClip(clipId) {
    set({ selectedTransitionClipId: clipId, selectedClipId: undefined })
  },

  setSelectedTrack(trackId) {
    set({ selectedTrackId: trackId })
  },

  setTimelineScale(scale) {
    set({ timelineScale: Math.min(TIMELINE_ZOOM.MAX, Math.max(TIMELINE_ZOOM.MIN, scale)) })
  },

  copyClip() {
    const state = get()
    if (!state.selectedClipId) return
    const selected = findClipById(state.project.tracks, state.selectedClipId)
    if (!selected || selected.type === "text") return
    set({ clipboard: deepClone(selected) })
  },

  pasteClip() {
    const state = get()
    const { clipboard } = state
    if (!clipboard || clipboard.type === "text") return

    const trackType: TrackType = clipboard.type === "audio" ? "audio" : "video"
    const targetTrack = state.project.tracks.find(t => t.type === trackType) ?? get().addTrack(trackType)
    const candidateStart = toSeconds(toMs(state.playhead))
    const sourceDuration = "mediaStart" in clipboard && "mediaEnd" in clipboard
      ? (clipboard.mediaEnd - clipboard.mediaStart) / (clipboard.speed ?? 1)
      : (clipboard.timelineEnd - clipboard.timelineStart)
    const candidateEnd = toSeconds(toMs(candidateStart + sourceDuration))

    const overlappingClips = targetTrack.clips.filter(
      clip => clip.timelineStart < candidateEnd && clip.timelineEnd > candidateStart,
    )

    const resolvedStart = overlappingClips.length > 0
      ? toSeconds(toMs(Math.max(...overlappingClips.map(clip => clip.timelineEnd))))
      : candidateStart
    const resolvedEnd = toSeconds(toMs(resolvedStart + sourceDuration))

    const newClip: Clip = {
      ...deepClone(clipboard),
      id: generateId(),
      trackId: targetTrack.id,
      timelineStart: resolvedStart,
      timelineEnd: resolvedEnd,
      ...(clipboard.type === "video" || clipboard.type === "audio"
        ? { audioConfig: { ...(clipboard.audioConfig ?? DEFAULT_AUDIO_CONFIG) } }
        : {}),
      ...(clipboard.type === "video" || clipboard.type === "image"
        ? { colorAdjustments: { ...(clipboard.colorAdjustments ?? DEFAULT_COLOR_ADJUSTMENTS) } }
        : {}),
      ...("transform" in clipboard ? { transform: { ...clipboard.transform } } : {}),
    }

    set(curr => ({
      project: {
        ...curr.project,
        tracks: curr.project.tracks.map(track =>
          track.id === targetTrack.id
            ? { ...track, clips: [...track.clips, newClip] }
            : track,
        ),
      },
    }))
    get().pushHistory("Paste clip")
    resetPlayer()
  },
})
