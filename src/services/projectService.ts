import Cookies from "js-cookie"
import { http } from '../api/http'
import type { ApiProject, PaginatedResponse, CreateProjectInput, UpdateProjectInput } from '../types/projectApiTypes'

function getAuthHeader(): Record<string, string> {
  const token = Cookies.get("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function getOwnProjects(page = 0, size = 10, sort?: string): Promise<PaginatedResponse<ApiProject>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (sort) params.set('sort', sort)
  return http<PaginatedResponse<ApiProject>>(`/projects?${params}`, { headers: getAuthHeader() })
}

export function getSharedProjects(page = 0, size = 10, sort?: string): Promise<PaginatedResponse<ApiProject>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (sort) params.set('sort', sort)
  return http<PaginatedResponse<ApiProject>>(`/projects/shared?${params}`, { headers: getAuthHeader() })
}

export function getProjectById(id: number): Promise<ApiProject> {
  return http<ApiProject>(`/projects/${id}`, { headers: getAuthHeader() })
}

export function createProject(data: CreateProjectInput): Promise<ApiProject> {
  return http<ApiProject>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: getAuthHeader(),
  })
}

export function updateProject(id: number, data: UpdateProjectInput): Promise<ApiProject> {
  return http<ApiProject>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: getAuthHeader(),
  })
}

export function deleteProject(id: number): Promise<void> {
  return http<void>(`/projects/${id}`, {
    method: 'DELETE',
    parse: false,
    headers: getAuthHeader(),
  })
}

export function shareProject(id: number, email: string): Promise<void> {
  return http<void>(`/projects/${id}/share`, {
    method: 'POST',
    body: JSON.stringify({ sharedWithEmail: email }),
    parse: false,
    headers: getAuthHeader(),
  })
}
