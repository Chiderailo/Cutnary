/**
 * AuthLayout - Split modal design for login/register
 * Left: marketing content with Cutnary feature pills
 * Right: form area
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

const FEATURE_PILLS = [
  { label: 'AI Clipping', color: 'border-blue-500/60 bg-blue-500/10 text-blue-400' },
  { label: 'Speaker Diarization', color: 'border-blue-400/60 bg-blue-400/10 text-blue-300' },
  { label: 'Video Transcript', color: 'border-blue-600/60 bg-blue-600/10 text-blue-400' },
  { label: 'Word Timestamps', color: 'border-sky-500/60 bg-sky-500/10 text-sky-400' },
]

interface AuthLayoutProps {
  mode: 'login' | 'register'
  children: ReactNode
}

export default function AuthLayout({ mode, children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen bg-black">
      {/* Glow effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-blue-500/15 blur-[140px]" />
        <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex h-16 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-white">Cutnary</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white">
            Home
          </Link>
          <Link href="/auth/login" className="text-sm text-zinc-400 transition-colors hover:text-white">
            Login
          </Link>
          <Link
            href="/auth/register"
            className="rounded-full bg-blue-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-400"
          >
            Sign Up
          </Link>
        </nav>
      </header>

      {/* Modal */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center px-4 py-8">
        <div className="w-full overflow-hidden rounded-2xl border border-zinc-800 bg-[#1A1A1A] shadow-2xl lg:grid lg:grid-cols-[1fr,1.1fr]">
          {/* Left panel - marketing */}
          <div className="relative hidden bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 lg:block">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239ca3af\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="mb-8 flex flex-wrap gap-3">
                  {FEATURE_PILLS.map((p) => (
                    <span
                      key={p.label}
                      className={`rounded-full border px-4 py-1.5 text-xs font-medium ${p.color}`}
                    >
                      {p.label}
                    </span>
                  ))}
                </div>
                <h2 className="text-2xl font-bold text-blue-500">
                  {mode === 'login' ? 'Log in to Unlock Features' : 'Unlock More Features'}
                </h2>
                <h3 className="mt-2 text-xl font-bold text-white">
                  {mode === 'login'
                    ? 'Access AI clipping & speaker-separated transcripts'
                    : 'Create viral clips & transcripts in minutes'}
                </h3>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
                  {mode === 'login'
                    ? 'Sign in to continue editing your clips, generating transcripts, and exporting with speaker labels.'
                    : 'Sign up to paste YouTube links, get AI-powered clips, and transcript with speaker diarization.'}
                </p>
              </div>
              <div className="mt-8 rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-4">
                <p className="text-xs text-zinc-500">
                  By proceeding, you agree to the Terms of Use and acknowledge our Privacy Policy.
                </p>
              </div>
            </div>
          </div>

          {/* Right panel - form */}
          <div className="relative p-8 sm:p-10">
            <Link
              href="/"
              className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
