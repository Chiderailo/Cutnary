/**
 * Login page - dark theme, violet accent
 */

import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    router.replace('/')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      const raw = typeof router.query.redirect === 'string' ? router.query.redirect : ''
      const redirect = raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('://') ? raw : '/'
      router.push(redirect || '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Sign In – Cutnary</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0b] px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-purple-600/15 blur-[140px]" />
        </div>

        <div className="relative w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-white">Cutnary</span>
          </Link>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-xl">
            <h1 className="text-2xl font-bold text-white">Sign in</h1>
            <p className="mt-2 text-sm text-zinc-400">Enter your email and password</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && (
                <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 font-medium text-white transition hover:from-violet-500 hover:to-purple-500 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-400">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="font-medium text-violet-400 hover:text-violet-300">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
