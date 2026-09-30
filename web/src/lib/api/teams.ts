import { api } from './client'
import type { Invite, Member, Team } from './types'

export const teamsApi = {
  list: () => api<Team[]>('/teams'),
  create: (name: string, description?: string | null) =>
    api<Team>('/teams', { method: 'POST', body: JSON.stringify({ name, description }) }),
  update: (teamId: string, body: { name?: string; description?: string | null }) =>
    api<Team>(`/teams/${teamId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (teamId: string) => api<{ detail: string }>(`/teams/${teamId}`, { method: 'DELETE' }),
  members: (teamId: string) => api<Member[]>(`/teams/${teamId}/members`),
  invites: (teamId: string) => api<Invite[]>(`/teams/${teamId}/invites`),
  invite: (teamId: string, email: string) =>
    api<Invite>(`/teams/${teamId}/invites`, { method: 'POST', body: JSON.stringify({ email }) }),
  accept: (token: string) => api<Team>(`/teams/invites/${token}/accept`, { method: 'POST' }),
}
