export interface ApiProject {
  id: number
  name: string
  status: 'DRAFT' | 'SHARED' | 'ARCHIVED'
  timelineData: string
  ownerId: number
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface CreateProjectInput {
  name: string
  timelineData?: string
}

export interface UpdateProjectInput {
  name?: string
  timelineData?: string
  status?: 'DRAFT' | 'SHARED' | 'ARCHIVED'
}
