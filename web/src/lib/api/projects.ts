import { api } from './client'
import type { BoardColumn, Project } from './types'

export const projectsApi = {
  list: (teamId: string) => api<Project[]>(`/teams/${teamId}/projects`),
  create: (teamId: string, name: string, color_token = 'accent') =>
    api<Project>(`/teams/${teamId}/projects`, {
      method: 'POST',
      body: JSON.stringify({ name, color_token }),
    }),
}

export const columnsApi = {
  list: (projectId: string) => api<BoardColumn[]>(`/projects/${projectId}/columns`),
  create: (
    projectId: string,
    body: {
      name: string
      description?: string | null
      color_token?: string
      is_done?: boolean
      position?: number
    },
  ) =>
    api<BoardColumn>(`/projects/${projectId}/columns`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (
    columnId: string,
    body: {
      name?: string
      description?: string | null
      color_token?: string
      is_done?: boolean
      position?: number
    },
  ) =>
    api<BoardColumn>(`/columns/${columnId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  reorder: (projectId: string, items: Array<{ id: string; position: number }>) =>
    api<BoardColumn[]>(`/projects/${projectId}/columns/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    }),
  remove: (columnId: string) =>
    api<{ detail: string }>(`/columns/${columnId}`, { method: 'DELETE' }),
}
