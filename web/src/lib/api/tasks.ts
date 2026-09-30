import { api } from './client'
import type { Attachment, Comment, Drawing, Subtask, Task, TaskLink } from './types'

export const tasksApi = {
  today: (teamId: string, mineOnly = false) =>
    api<Task[]>(`/teams/${teamId}/today?mine_only=${mineOnly}`),
  list: (projectId: string) => api<Task[]>(`/projects/${projectId}/tasks`),
  create: (projectId: string, body: Partial<Task> & { title: string }) =>
    api<Task>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  get: (taskId: string) => api<Task>(`/tasks/${taskId}`),
  update: (taskId: string, body: Record<string, unknown>) =>
    api<Task>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (taskId: string) => api<{ detail: string }>(`/tasks/${taskId}`, { method: 'DELETE' }),
  reorder: (
    projectId: string,
    items: Array<{ id: string; position?: number; column_id?: string; status?: string }>,
  ) =>
    api<Task[]>(`/projects/${projectId}/tasks/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    }),
  comments: (taskId: string) => api<Comment[]>(`/tasks/${taskId}/comments`),
  addComment: (taskId: string, body: string) =>
    api<Comment>(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
  drawing: (taskId: string) => api<Drawing | null>(`/tasks/${taskId}/drawing`),
  saveDrawing: (taskId: string, scene_json: Record<string, unknown>) =>
    api<Drawing>(`/tasks/${taskId}/drawing`, {
      method: 'PUT',
      body: JSON.stringify({ scene_json }),
    }),
  attachments: (taskId: string) => api<Attachment[]>(`/tasks/${taskId}/attachments`),
  addAttachment: (taskId: string, label: string, url: string) =>
    api<Attachment>(`/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: JSON.stringify({ label, url }),
    }),
  addSubtask: (taskId: string, title: string) =>
    api<Subtask>(`/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) }),
  updateSubtask: (subtaskId: string, body: { title?: string; is_done?: boolean }) =>
    api<Subtask>(`/subtasks/${subtaskId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  links: (taskId: string) => api<TaskLink[]>(`/tasks/${taskId}/links`),
  addLink: (
    taskId: string,
    body: { to_task_id: string; link_type: 'blocks' | 'relates_to' | 'depends_on' },
  ) => api<TaskLink>(`/tasks/${taskId}/links`, { method: 'POST', body: JSON.stringify(body) }),
  removeLink: (linkId: string) => api<{ detail: string }>(`/links/${linkId}`, { method: 'DELETE' }),
}
