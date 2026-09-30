import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  authApi,
  clearAuth,
  getStoredUser,
  persistAuth,
  persistUser,
  type AuthResponse,
  type User,
} from '@/lib/api'

type AuthContextValue = {
  user: User | null
  setSession: (data: AuthResponse) => void
  logout: () => Promise<void>
  refreshUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser())

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      setSession: (data) => {
        persistAuth(data)
        setUser(data.user)
      },
      logout: async () => {
        await authApi.logout()
        clearAuth()
        setUser(null)
      },
      refreshUser: (next) => {
        persistUser(next)
        setUser(next)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('AuthProvider missing')
  return ctx
}
