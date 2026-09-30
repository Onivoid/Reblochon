import { api, clearAuth, getRefreshToken } from './client'
import type { AuthResponse, AvatarConfig, User } from './types'

export const authApi = {
  register: (body: { email: string; password: string; display_name: string; locale?: string }) =>
    api<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    api<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: async () => {
    const refresh = getRefreshToken()
    if (refresh) {
      try {
        await api('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refresh }),
        })
      } catch {
        /* ignore */
      }
    }
    clearAuth()
  },
  me: () => api<User>('/me'),
  updateMe: (body: {
    locale?: string
    display_name?: string
    job_title?: string | null
    avatar_seed?: string | null
    avatar_config?: AvatarConfig | null
  }) => api<User>('/me', { method: 'PATCH', body: JSON.stringify(body) }),
}
