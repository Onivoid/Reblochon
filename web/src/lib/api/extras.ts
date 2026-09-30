import { api } from './client'
import type { Activity, DailyNote, FocusSession, Stats } from './types'

export const extrasApi = {
  activity: (teamId: string) => api<Activity[]>(`/teams/${teamId}/activity`),
  stats: (teamId: string) => api<Stats>(`/teams/${teamId}/stats`),
  dailyNote: (teamId: string) => api<DailyNote | null>(`/teams/${teamId}/daily-note`),
  saveDailyNote: (teamId: string, body: string) =>
    api<DailyNote>(`/teams/${teamId}/daily-note`, {
      method: 'PUT',
      body: JSON.stringify({ body }),
    }),
  startFocus: (taskId?: string) =>
    api<FocusSession>('/focus', {
      method: 'POST',
      body: JSON.stringify({ task_id: taskId ?? null, duration_sec: 1500 }),
    }),
  endFocus: (sessionId: string) => api<FocusSession>(`/focus/${sessionId}/end`, { method: 'POST' }),
}
