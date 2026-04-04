import type { StateCreator } from "zustand"
import { resetPlayer } from "../../hooks/usePlayer"
import { TIMELINE_ZOOM } from "../../constants/timeline"
import { DEFAULT_AUDIO_CONFIG } from "../../constants/audioConfig"
import { DEFAULT_COLOR_ADJUSTMENTS } from "../../constants/colorAdjustments"
import { toMs, toSeconds } from "../../utils/time"
import { generateId } from "../../utils/id"
import type { Clip, ClipGroup, TrackType } from "../../project/projectTypes"
import type { EditorStore } from "../editorStore"

export interface UiSlice {
  selectedClipId?: string
  selectedClipIds: string[]
  activeGroupId?: string
  groupEditGroupId?: string
  selectedTransitionClipId?: string
  selectedTrackId?: string
  timelineScale: number
  clipboard: Clip | null
  setSelectedClip: (clipId: string | undefined) => void
  toggleClipSelection: (clipId: string) => void
  setSelectedClips: (clipIds: string[]) => void
  clearClipSelection: () => void
  enterGroupEditMode: (groupId: string | undefined) => void
  exitGroupEditMode: () => void
  createGroupFromSelection: (name?: string) => void
  ungroupSelected: () => void
  setSelectedTransitionClip: (clipId: string | undefined) => void
  setSelectedTrack: (trackId: string | undefined) => void
  setTimelineScale: (scale: number) => void
  /** Copies the currently selected clip into the clipboard. No-op if nothing is selected. */
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

function listExistingClipIds(tracks: EditorStore["project"]["tracks"]): Set<string> {
  const ids = new Set<string>()
  for (const track of tracks) {
    for (const clip of track.clips) {
      ids.add(clip.id)
    }
  }
  return ids
}

function findGroupByClip(project: EditorStore["project"], clipId: string): ClipGroup | undefined {
  return (project.clipGroups ?? []).find(group => group.memberClipIds.includes(clipId))
}

function sanitizeSelection(project: EditorStore["project"], clipIds: string[]): string[] {
  const existing = listExistingClipIds(project.tracks)
  return [...new Set(clipIds)].filter(id => existing.has(id))
}

function choosePrimary(selectedClipIds: string[], preferred?: string): string | undefined {
  if (preferred && selectedClipIds.includes(preferred)) return preferred
  return selectedClipIds[0]
}

export const createUiSlice: StateCreator<EditorStore, [], [], UiSlice> = (set, get) => ({
  selectedClipId: undefined,
  selectedClipIds: [],
  activeGroupId: undefined,
  groupEditGroupId: undefined,
  selectedTransitionClipId: undefined,
  selectedTrackId: undefined,
  timelineScale: TIMELINE_ZOOM.DEFAULT,
  clipboard: null,

  setSelectedClip(clipId) {
    if (!clipId) {
      set({
        selectedClipId: undefined,
        selectedClipIds: [],
        activeGroupId: undefined,
        selectedTransitionClipId: undefined,
      })
      return
    }

    const state = get()
    const group = findGroupByClip(state.project, clipId)
    if (group && state.groupEditGroupId !== group.id) {
      const groupMembers = sanitizeSelection(state.project, group.memberClipIds)
      set({
        selectedClipId: choosePrimary(groupMembers, clipId),
        selectedClipIds: groupMembers,
        activeGroupId: group.id,
        selectedTransitionClipId: undefined,
      })
      return
    }

    set({
      selectedClipId: clipId,
      selectedClipIds: [clipId],
      activeGroupId: undefined,
      selectedTransitionClipId: undefined,
    })
  },

  toggleClipSelection(clipId) {
    const state = get()
    const selected = new Set(state.selectedClipIds)
    const group = findGroupByClip(state.project, clipId)

    // Ctrl/Cmd+clicking a member of a selected group enters member edit mode first.
    const shouldEnterGroupEdit = !!group && state.activeGroupId === group.id && state.groupEditGroupId !== group.id
    if (shouldEnterGroupEdit && group) {
      set({ groupEditGroupId: group.id, activeGroupId: undefined })
    }

    if (selected.has(clipId)) selected.delete(clipId)
    else selected.add(clipId)

    const nextSelected = sanitizeSelection(state.project, [...selected])
    set({
      selectedClipIds: nextSelected,
      selectedClipId: choosePrimary(nextSelected, clipId),
      activeGroupId: undefined,
      selectedTransitionClipId: undefined,
    })
  },

  setSelectedClips(clipIds) {
    const state = get()
    const nextSelected = sanitizeSelection(state.project, clipIds)
    set({
      selectedClipIds: nextSelected,
      selectedClipId: choosePrimary(nextSelected),
      activeGroupId: undefined,
      selectedTransitionClipId: undefined,
    })
  },

  clearClipSelection() {
    set({
      selectedClipId: undefined,
      selectedClipIds: [],
      activeGroupId: undefined,
      selectedTransitionClipId: undefined,
    })
  },

  enterGroupEditMode(groupId) {
    const state = get()
    if (!groupId) {
      set({ groupEditGroupId: undefined, activeGroupId: undefined })
      return
    }
    const group = (state.project.clipGroups ?? []).find(g => g.id === groupId)
    if (!group) return
    const groupMembers = sanitizeSelection(state.project, group.memberClipIds)
    set({
      groupEditGroupId: group.id,
      activeGroupId: undefined,
      selectedClipIds: groupMembers,
      selectedClipId: choosePrimary(groupMembers, state.selectedClipId),
      selectedTransitionClipId: undefined,
    })
  },

  exitGroupEditMode() {
    set({ groupEditGroupId: undefined })
  },

  createGroupFromSelection(name) {
    const state = get()
    const members = sanitizeSelection(state.project, state.selectedClipIds)
    if (members.length < 2) return

    const existingGroupIds = new Set<string>()
    for (const clipId of members) {
      const group = findGroupByClip(state.project, clipId)
      if (group) existingGroupIds.add(group.id)
    }

    const filteredGroups = (state.project.clipGroups ?? []).filter(group => !existingGroupIds.has(group.id))
    const group: ClipGroup = {
      id: generateId(),
      name: name?.trim() || undefined,
      memberClipIds: members,
      locked: false,
      visible: true,
      createdAt: Date.now(),
    }

    set({
      project: {
        ...state.project,
        clipGroups: [...filteredGroups, group],
      },
      selectedClipIds: members,
      selectedClipId: choosePrimary(members, state.selectedClipId),
      activeGroupId: group.id,
      groupEditGroupId: undefined,
      selectedTransitionClipId: undefined,
    })
    get().pushHistory("Create group")
  },

  ungroupSelected() {
    const state = get()
    const selected = sanitizeSelection(state.project, state.selectedClipIds)
    if (selected.length === 0) return

    const selectedGroupIds = new Set<string>()
    for (const clipId of selected) {
      const group = findGroupByClip(state.project, clipId)
      if (group) selectedGroupIds.add(group.id)
    }
    if (selectedGroupIds.size === 0) return

    const remainingGroups = (state.project.clipGroups ?? []).filter(group => !selectedGroupIds.has(group.id))
    set({
      project: {
        ...state.project,
        clipGroups: remainingGroups,
      },
      activeGroupId: undefined,
      groupEditGroupId: undefined,
      selectedClipIds: selected,
      selectedClipId: choosePrimary(selected, state.selectedClipId),
      selectedTransitionClipId: undefined,
    })
    get().pushHistory("Ungroup")
  },

  setSelectedTransitionClip(clipId) {
    set({
      selectedTransitionClipId: clipId,
      selectedClipId: undefined,
      selectedClipIds: [],
      activeGroupId: undefined,
    })
  },

  setSelectedTrack(trackId) {
    set({ selectedTrackId: trackId })
  },

  setTimelineScale(scale) {
    set({ timelineScale: Math.min(TIMELINE_ZOOM.MAX, Math.max(TIMELINE_ZOOM.MIN, scale)) })
  },

  copyClip() {
    const state = get()
    const sourceId = state.selectedClipId ?? state.selectedClipIds[0]
    if (!sourceId) return
    const selected = findClipById(state.project.tracks, sourceId)
    if (!selected) return
    set({ clipboard: deepClone(selected) })
  },

  pasteClip() {
    const state = get()
    const { clipboard } = state
    if (!clipboard) return

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
