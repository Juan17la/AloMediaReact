import { http } from '../api/http'
import { getAuthHeader } from '../api/authHeader'
import type { ApiProject, PaginatedResponse, CreateProjectInput, UpdateProjectInput } from '../types/projectApiTypes'

export class ProjectService {
  private static _instance: ProjectService

  static get instance(): ProjectService {
    if (!ProjectService._instance) {
      ProjectService._instance = new ProjectService()
    }
    return ProjectService._instance
  }

  async getOwnProjects(page = 0, size = 10, sort?: string): Promise<PaginatedResponse<ApiProject>> {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (sort) params.set('sort', sort)
    return http<PaginatedResponse<ApiProject>>(`/projects?${params}`, { headers: getAuthHeader() })
  }

  async getSharedProjects(page = 0, size = 10, sort?: string): Promise<PaginatedResponse<ApiProject>> {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (sort) params.set('sort', sort)
    return http<PaginatedResponse<ApiProject>>(`/projects/shared?${params}`, { headers: getAuthHeader() })
  }

  async getProjectById(id: number): Promise<ApiProject> {
    return http<ApiProject>(`/projects/${id}`, { headers: getAuthHeader() })
  }

  async createProject(data: CreateProjectInput): Promise<ApiProject> {
    return http<ApiProject>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: getAuthHeader(),
    })
  }

  async updateProject(id: number, data: UpdateProjectInput): Promise<ApiProject> {
    return http<ApiProject>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: getAuthHeader(),
    })
  }

  async deleteProject(id: number): Promise<void> {
    return http<void>(`/projects/${id}`, {
      method: 'DELETE',
      parse: false,
      headers: getAuthHeader(),
    })
  }

  async shareProject(id: number, email: string): Promise<void> {
    return http<void>(`/projects/${id}/share`, {
      method: "POST",
      body: JSON.stringify({ sharedWithEmail: email }),
      parse: false,
      headers: getAuthHeader(),
    })
  }

  async getProjectHistory(id: number): Promise<ApiProject[]> {
    return http<ApiProject[]>(`/history/${id}`, { headers: getAuthHeader() })
  }
}

export const projectService = ProjectService.instance

export const getOwnProjects = (page?: number, size?: number, sort?: string) => projectService.getOwnProjects(page, size, sort)
export const getSharedProjects = (page?: number, size?: number, sort?: string) => projectService.getSharedProjects(page, size, sort)
export const getProjectById = (id: number) => projectService.getProjectById(id)
export const createProject = (data: CreateProjectInput) => projectService.createProject(data)
export const updateProject = (id: number, data: UpdateProjectInput) => projectService.updateProject(id, data)
export const deleteProject = (id: number) => projectService.deleteProject(id)
export const shareProject = (id: number, email: string) => projectService.shareProject(id, email)
export const getProjectHistory = (id: number) => projectService.getProjectHistory(id)