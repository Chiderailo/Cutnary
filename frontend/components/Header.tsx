/**
 * Header - Top navigation bar with logo, Library, and user menu
 * Shows user avatar (initials) and dropdown when logged in; Sign In when not
 */

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { getLibrary } from '@/lib/library'

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth()
  const [libraryCount, setLibraryCount] = useState(0)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => setLibraryCount(getLibrary().length)
    update()
    window.addEventListener('cutnary-library-updated', update)
    return () => window.removeEventListener('cutnary-library-updated', update)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-[#0a0a0b]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">Cutnary</span>
        </Link>

        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link
                href="/library"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                Library
                {libraryCount > 0 && (
                  <span className="rounded-full bg-violet-600 px-2 py-0.5 text-xs font-medium text-white">
                    {libraryCount}
                  </span>
                )}
              </Link>

              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-medium text-white">
                    {user?.initials ?? user?.email?.slice(0, 2).toUpperCase() ?? '?'}
                  </div>
                  <span className="hidden sm:inline">{user?.name ?? user?.email ?? 'User'}</span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-1 w-48 rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl">
                    <Link
                      href="/library"
                      className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Library
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false)
                        logout()
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:from-violet-500 hover:to-purple-500"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
