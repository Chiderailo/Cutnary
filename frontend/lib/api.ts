/**
 * API client for Cutnary backend.
 * Adds Authorization Bearer token to all requests.
 * Redirects to /auth/login on 401.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('cutnary_token')
}

export interface ApiOptions extends RequestInit {
  skipAuth?: boolean
}

export async function apiFetch(path: string, options: ApiOptions = {}): Promise<Response> {
  const { skipAuth, ...init } = options
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && (init.body && typeof init.body === 'string')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = skipAuth ? null : getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })

  if (res.status === 401 && !skipAuth) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cutnary_token')
      const redirect = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.href = `/auth/login${redirect ? `?redirect=${redirect}` : ''}`
    }
  }

  return res
}

export async function apiJson<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const res = await apiFetch(path, options)
  const text = await res.text()
  if (!text.trim()) {
    throw new Error(res.ok ? 'Empty response' : `Server error (${res.status})`)
  }
  try {
    const data = JSON.parse(text) as T
    if (!res.ok) {
      throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`)
    }
    return data
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Request failed')) throw e
    throw new Error(res.ok ? `Invalid response` : `Server error (${res.status}): ${text.slice(0, 80)}`)
  }
}
