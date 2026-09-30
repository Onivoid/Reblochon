import type { AuthResponse, User } from './types'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const ACCESS_KEY = 'reblochon-access'
const REFRESH_KEY = 'reblochon-refresh'
const USER_KEY = 'reblochon-user'

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function persistAuth(data: AuthResponse) {
  localStorage.setItem(ACCESS_KEY, data.access_token)
  localStorage.setItem(REFRESH_KEY, data.refresh_token)
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
}

export function persistUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}

async function refreshAccess(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) return null
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  })
  if (!res.ok) {
    clearAuth()
    return null
  }
  const data = (await res.json()) as AuthResponse
  persistAuth(data)
  return data.access_token
}

export class ApiError extends Error {
  status: number
  detail: string
  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (res.status === 401 && retry) {
    const next = await refreshAccess()
    if (next) return api<T>(path, options, false)
  }
  if (!res.ok) {
    let detail = 'error'
    try {
      const body = (await res.json()) as { detail?: string }
      detail = body.detail ?? detail
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
