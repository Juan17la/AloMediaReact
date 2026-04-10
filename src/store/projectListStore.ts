import { create } from 'zustand'
import { getOwnProjects, getSharedProjects } from '../services/projectService'
import type { ApiProject, PaginatedResponse } from '../types/projectApiTypes'

interface ProjectListState {
  scopedUserId: number | null
  ownCache: Record<number, PaginatedResponse<ApiProject>>
  sharedCache: Record<number, PaginatedResponse<ApiProject>>
  isLoadingOwn: boolean
  isLoadingShared: boolean
  ownError: string | null
  sharedError: string | null
  setUserScope: (userId: number | null) => void
  clearCache: () => void
  fetchOwn: (page: number) => Promise<void>
  fetchShared: (page: number) => Promise<void>
}

export const useProjectListStore = create<ProjectListState>((set, get) => ({
  scopedUserId: null,
  ownCache: {},
  sharedCache: {},
  isLoadingOwn: false,
  isLoadingShared: false,
  ownError: null,
  sharedError: null,

  setUserScope(userId) {
    if (get().scopedUserId === userId) return
    set({
      scopedUserId: userId,
      ownCache: {},
      sharedCache: {},
      ownError: null,
      sharedError: null,
      isLoadingOwn: false,
      isLoadingShared: false,
    })
  },

  clearCache() {
    set({
      ownCache: {},
      sharedCache: {},
      ownError: null,
      sharedError: null,
      isLoadingOwn: false,
      isLoadingShared: false,
    })
  },

  async fetchOwn(page) {
    if (get().ownCache[page]) return
    set({ isLoadingOwn: true, ownError: null })
    try {
      const data = await getOwnProjects(page, 8, 'updatedAt,desc')
      set(s => ({ ownCache: { ...s.ownCache, [page]: data }, isLoadingOwn: false }))
    } catch {
      set({ ownError: 'Failed to load projects.', isLoadingOwn: false })
    }
  },

  async fetchShared(page) {
    if (get().sharedCache[page]) return
    set({ isLoadingShared: true, sharedError: null })
    try {
      const data = await getSharedProjects(page, 8)
      set(s => ({ sharedCache: { ...s.sharedCache, [page]: data }, isLoadingShared: false }))
    } catch {
      set({ sharedError: 'Failed to load shared projects.', isLoadingShared: false })
    }
  },
}))
