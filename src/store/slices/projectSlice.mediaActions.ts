import type { StateCreator } from "zustand"
import { getInsertionIndex } from "../../utils/tracks"
import { DEFAULT_TEXT_STYLE, DEFAULT_TEXT_TRANSFORM } from "../../constants/textStyle"
import { generateId } from "../../utils/id"
import { hashFile } from "../../utils/fileHash"
import { parseSrtFile } from "../../utils/srtParser.ts"
import { fileCacheService } from "../../services/fileCacheService"
import { generateProxy } from "../../engine/proxyEngine"
import { resetPlayer } from "../../hooks/usePlayer"
import { createEditHistory } from "../../utils/editHistory"
import { toMs, toSeconds } from "../../utils/time"
import type {
  Media,
  Project,
  TextClip,
  Track,
} from "../../project/projectTypes"
import type { SubtitleEntry } from "../../utils/srtParser.ts"
import type { EditorStore } from "../editorStore"
import type { ProjectMediaActions } from "./projectSlice.types"
import { getMediaDuration } from "./projectSlice.helpers"
import { validateMediaFile } from "../../utils/mediaValidation"
import { fileMap, makeInitialProject } from "./projectSlice.state"

export const createProjectMediaActions: StateCreator<EditorStore, [], [], ProjectMediaActions> = (set, get) => ({
  setMissingMediaIds(ids) {
    set({ missingMediaIds: ids })
  },

  async loadProject(project) {
    fileMap.clear()
    const existingClipIds = new Set(project.tracks.flatMap(track => track.clips.map(clip => clip.id)))
    const normalizedProject: Project = {
      ...project,
      clipGroups: (project.clipGroups ?? [])
        .map(group => ({
          ...group,
          memberClipIds: group.memberClipIds.filter(id => existingClipIds.has(id)),
        }))
        .filter(group => group.memberClipIds.length > 1),
    }
    set({
      project: normalizedProject,
      proxyMap: {},
      editHistory: createEditHistory(),
      playhead: 0,
      isPlaying: false,
      selectedClipId: undefined,
      selectedClipIds: [],
      activeGroupId: undefined,
      groupEditGroupId: undefined,
      selectedTransitionClipId: undefined,
      missingMediaIds: new Set(),
      idbResolvedMediaIds: new Set(),
    })
    resetPlayer()

    const missing = new Set<string>()
    const resolved = new Set<string>()

    await Promise.all(
      normalizedProject.media.map(async (m) => {
        try {
          const cached = await fileCacheService.getFileFromCache(m.hash)
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
    const validation = validateMediaFile(file)
    if (!validation.valid) {
      throw new Error(validation.reason)
    }
    const type = validation.type!
    const hash = type === "subtitles"
      ? `${file.name}:${file.size}:${file.lastModified}`
      : await hashFile(file)

    const existing = get().project.media.find(m => m.hash === hash)
    if (existing) return existing

    const duration = await getMediaDuration(file, type)
    const format = file.type || (type === "subtitles" ? "application/x-subrip" : "")

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

  async importSubtitlesAsGroup(groupName, file) {
    const media = await get().addMedia(file)
    if (media.type !== "subtitles") {
      throw new Error("Selected file is not an SRT subtitle file")
    }

    const content = await file.text()
    const entries = parseSrtFile(content)
    if (entries.length === 0) {
      throw new Error("No valid subtitle entries were found in the SRT file")
    }

    const sorted = get().project.tracks.slice().sort((a, b) => a.order - b.order)
    const insertIdx = getInsertionIndex(sorted, "video")
    const subtitleTrackId = generateId()
    const subtitleTrack: Track = {
      id: subtitleTrackId,
      type: "video",
      order: insertIdx,
      clips: [],
    }

    const clips: TextClip[] = entries.map((entry: SubtitleEntry) => ({
      id: generateId(),
      trackId: subtitleTrackId,
      type: "text",
      timelineStart: toSeconds(toMs(entry.startTime)),
      timelineEnd: toSeconds(toMs(entry.endTime)),
      content: entry.text,
      transform: { ...DEFAULT_TEXT_TRANSFORM },
      style: { ...DEFAULT_TEXT_STYLE },
    }))

    const nextTracks = [
      ...sorted.slice(0, insertIdx),
      { ...subtitleTrack, clips },
      ...sorted.slice(insertIdx),
    ].map((track, index) => ({ ...track, order: index }))

    const groupId = generateId()
    const memberClipIds = clips.map(clip => clip.id)
    const normalizedName = groupName.trim() || file.name

    get().pushHistory("Import subtitles")
    resetPlayer()
    set(state => ({
      project: {
        ...state.project,
        tracks: nextTracks,
        clipGroups: [
          ...(state.project.clipGroups ?? []),
          {
            id: groupId,
            name: `Subtitles - ${normalizedName}`,
            memberClipIds,
            locked: false,
            visible: true,
            createdAt: Date.now(),
          },
        ],
      },
      selectedClipId: memberClipIds[0],
      selectedClipIds: memberClipIds,
    }))

    return { trackId: subtitleTrackId, groupId, clipCount: clips.length }
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
          clipGroups: (state.project.clipGroups ?? [])
            .map(group => ({
              ...group,
              memberClipIds: group.memberClipIds.filter(id => !removedClipIds.has(id)),
            }))
            .filter(group => group.memberClipIds.length > 1),
        },
        selectedClipId: state.selectedClipId && removedClipIds.has(state.selectedClipId) ? undefined : state.selectedClipId,
        selectedClipIds: state.selectedClipIds.filter(id => !removedClipIds.has(id)),
      }
    })
  },

  resetProject() {
    fileMap.clear()
    set({
      project: makeInitialProject(),
      proxyMap: {},
      editHistory: createEditHistory(),
      playhead: 0,
      isPlaying: false,
      missingMediaIds: new Set(),
      idbResolvedMediaIds: new Set(),
      selectedClipId: undefined,
      selectedClipIds: [],
      activeGroupId: undefined,
      groupEditGroupId: undefined,
      selectedTransitionClipId: undefined,
      selectedTrackId: undefined,
    })
    resetPlayer()
  },
})