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
  role?: 'user' | 'admin'
  initials?: string
  profilePictureUrl?: string | null
  emailVerified?: boolean
}

export type RegisterResult =
  | { user: User; token: string }
  | { needsEmailVerification: true; email: string; message?: string }

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ user: User; token: string }>
  register: (name: string, email: string, password: string) => Promise<RegisterResult>
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

  const mapUser = (u: Record<string, unknown>): User | null => {
    if (!u?.id) return null
    const role = u.role === 'admin' ? 'admin' : 'user'
    return {
      id: u.id as number,
      email: u.email as string,
      fullName: (u.fullName ?? u.name ?? null) as string | null,
      name: (u.name ?? u.fullName ?? null) as string | null,
      role,
      initials: u.initials as string | undefined,
      profilePictureUrl: (u.profilePictureUrl ?? null) as string | null,
      emailVerified: (u.emailVerified as boolean | undefined) ?? (u.emailVerifiedAt != null),
    }
  }

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
        const raw = await res.json()
        const u = raw.data ?? raw
        const mapped = mapUser(u)
        if (mapped) setUser(mapped)
        else setUser(null)
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

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      skipAuth: true,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const raw = await res.json()
    const data = raw.data ?? raw
    if (!res.ok) {
      if (res.status === 403 && data.code === 'EMAIL_NOT_VERIFIED') {
        const err = new Error(data.message ?? 'Please verify your email first.') as Error & { code?: string }
        err.code = 'EMAIL_NOT_VERIFIED'
        throw err
      }
      throw new Error(data.message ?? data.error ?? 'Login failed')
    }
    const token = data.token
    const u = data.user
    if (!token) throw new Error('No token in response')
    localStorage.setItem('cutnary_token', token)
    const userData = mapUser(u)
    if (!userData) throw new Error('Invalid user in response')
    setUser(userData)
    return { user: userData, token }
  }, [])

  const register = useCallback(async (name: string, email: string, password: string): Promise<RegisterResult> => {
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
    if (data.needsEmailVerification) {
      return {
        needsEmailVerification: true,
        email: data.email ?? email,
        message: data.message,
      }
    }
    const token = data.token
    const u = data.user
    if (!token) throw new Error('No token in response')
    localStorage.setItem('cutnary_token', token)
    const userData = mapUser(u)
    if (!userData) throw new Error('Invalid user in response')
    setUser(userData)
    return { user: userData, token }
  }, [])

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
