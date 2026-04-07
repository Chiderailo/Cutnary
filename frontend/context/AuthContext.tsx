'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch } from '../lib/api'

export interface User {
  id: number
  email: string
  fullName: string | null
  name?: string | null
  initials?: string
  profilePictureUrl?: string | null
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ user: User; token: string }>
  register: (name: string, email: string, password: string) => Promise<{ user: User; token: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cutnary_token') : null
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }
    try {
      const res = await apiFetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        const u = data.data ?? data
        if (u?.id) {
          setUser({
            id: u.id,
            email: u.email,
            fullName: u.fullName ?? u.name ?? null,
            name: u.name ?? u.fullName ?? null,
            initials: u.initials,
            profilePictureUrl: u.profilePictureUrl ?? null,
          })
        }
      } else {
        localStorage.removeItem('cutnary_token')
        setUser(null)
      }
    } catch {
      localStorage.removeItem('cutnary_token')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch('/api/auth/login', {
        skipAuth: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const raw = await res.json()
      const data = raw.data ?? raw
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? 'Login failed')
      }
      const token = data.token
      const u = data.user
      if (!token) throw new Error('No token in response')
      localStorage.setItem('cutnary_token', token)
      const userData: User = {
        id: u.id,
        email: u.email,
        fullName: u.fullName ?? u.name ?? null,
        name: u.name ?? u.fullName ?? null,
        initials: u.initials,
        profilePictureUrl: u.profilePictureUrl ?? null,
      }
      setUser(userData)
      return { user: userData, token }
    },
    []
  )

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await apiFetch('/api/auth/register', {
        skipAuth: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, passwordConfirmation: password }),
      })
      const raw = await res.json()
      const data = raw.data ?? raw
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? 'Registration failed')
      }
      const token = data.token
      const u = data.user
      if (!token) throw new Error('No token in response')
      localStorage.setItem('cutnary_token', token)
      const userData: User = {
        id: u.id,
        email: u.email,
        fullName: u.fullName ?? u.name ?? name ?? null,
        name: u.name ?? u.fullName ?? name ?? null,
        initials: u.initials,
        profilePictureUrl: u.profilePictureUrl ?? null,
      }
      setUser(userData)
      return { user: userData, token }
    },
    []
  )

  const logout = useCallback(async () => {
    const token = localStorage.getItem('cutnary_token')
    if (token) {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' })
      } catch {
        /* ignore */
      }
      localStorage.removeItem('cutnary_token')
    }
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser: fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
