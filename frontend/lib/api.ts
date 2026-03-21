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

/**
 * Safely parse response text as JSON. Logs for debugging.
 */
export async function parseResponseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  console.log('API response:', text)
  if (!text.trim()) {
    throw new Error(res.ok ? 'Empty response' : `Server error (${res.status})`)
  }
  let data: T
  try {
    data = JSON.parse(text) as T
  } catch (e) {
    console.error('API response was not JSON:', text)
    throw new Error(`Server error: ${text.slice(0, 200)}`)
  }
  if (!res.ok) {
    throw new Error(
      (data as { error?: string })?.error ??
        (data as { message?: string })?.message ??
        `Request failed (${res.status})`
    )
  }
  return data
}

export async function apiJson<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const res = await apiFetch(path, options)
  return parseResponseJson<T>(res)
}
