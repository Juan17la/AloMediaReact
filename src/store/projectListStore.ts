import { create } from 'zustand'
import { projectService } from '../services/projectService'
import type { ApiProject, PaginatedResponse } from '../types/projectApiTypes'

interface ProjectListState {
  ownData: Record<number, PaginatedResponse<ApiProject>>
  sharedData: Record<number, PaginatedResponse<ApiProject>>
  isLoadingOwn: boolean
  isLoadingShared: boolean
  ownError: string | null
  sharedError: string | null
  fetchOwn: (page: number) => Promise<void>
  fetchShared: (page: number) => Promise<void>
}

export const useProjectListStore = create<ProjectListState>((set) => ({
  ownData: {},
  sharedData: {},
  isLoadingOwn: false,
  isLoadingShared: false,
  ownError: null,
  sharedError: null,

  async fetchOwn(page) {
    if (page === 0) set({ ownData: {}, ownError: null })
    set({ isLoadingOwn: true, ownError: null })
    try {
      const data = await projectService.getOwnProjects(page, 8, 'updatedAt,desc')
      set(s => ({ ownData: { ...s.ownData, [page]: data }, isLoadingOwn: false }))
    } catch {
      set({ ownError: 'Failed to load projects.', isLoadingOwn: false })
    }
  },

  async fetchShared(page) {
    if (page === 0) set({ sharedData: {}, sharedError: null })
    set({ isLoadingShared: true, sharedError: null })
    try {
      const data = await projectService.getSharedProjects(page, 8)
      set(s => ({ sharedData: { ...s.sharedData, [page]: data }, isLoadingShared: false }))
    } catch {
      set({ sharedError: 'Failed to load shared projects.', isLoadingShared: false })
    }
  },
}))
