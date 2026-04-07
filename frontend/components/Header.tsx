/**
 * Header - Top nav with Resources mega-menu (Opus Clip style)
 * Desktop: dropdown | Mobile: accordion
 */

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '@/context/AuthContext'
import { getLibrary } from '@/lib/library'
import ResourcesMegaMenu from '@/components/ResourcesMegaMenu'
import { apiFetch, apiJson, parseResponseJson } from '@/lib/api'

interface Notification {
  id: number
  type: string
  message: string
  read: boolean
  createdAt: string
}

export default function Header() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuth()
  const [libraryCount, setLibraryCount] = useState(0)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const resourcesRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const resourcesOpenAt = useRef<number>(0)

  useEffect(() => {
    const update = () => setLibraryCount(getLibrary().length)
    update()
    window.addEventListener('cutnary-library-updated', update)
    return () => window.removeEventListener('cutnary-library-updated', update)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    const fetchNotifications = () => {
      apiJson<{ success: boolean; notifications?: Notification[] }>('/api/notifications')
        .then((data) => {
          if (data.success && data.notifications) setNotifications(data.notifications)
        })
        .catch(() => {})
    }
    fetchNotifications()
    const t = setInterval(fetchNotifications, 30000)
    return () => clearInterval(t)
  }, [isAuthenticated])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = async (id: number) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch {}
  }

  useEffect(() => {
    setResourcesOpen(false)
    setMobileMenuOpen(false)
  }, [router.pathname])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(t)) setDropdownOpen(false)
      if (resourcesRef.current && !resourcesRef.current.contains(t)) {
        if (Date.now() - resourcesOpenAt.current < 100) return
        setResourcesOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(t)) setNotificationsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleResources = () => {
    setResourcesOpen((o) => {
      const next = !o
      if (next) resourcesOpenAt.current = Date.now()
      return next
    })
  }

  const closeAll = () => {
    setResourcesOpen(false)
    setMobileMenuOpen(false)
    setDropdownOpen(false)
  }

  const navOrder = (
    <>
      <Link
        href="/"
        onClick={closeAll}
        className={`rounded-lg px-3 py-2 text-sm transition-colors ${
          router.pathname === '/' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
        }`}
      >
        Home
      </Link>
      {isAuthenticated && (
        <>
          <Link
            href="/library"
            onClick={closeAll}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            Library
          {libraryCount > 0 && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
              {libraryCount}
            </span>
          )}
        </Link>
          <Link
            href="/social"
            onClick={closeAll}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              router.pathname === '/social' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            Social
          </Link>
        </>
      )}
      <div
        ref={resourcesRef}
        className="relative"
        onMouseLeave={() => window.innerWidth >= 768 && setResourcesOpen(false)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleResources()
          }}
          onMouseEnter={() => window.innerWidth >= 768 && setResourcesOpen(true)}
          className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors ${
            resourcesOpen || router.pathname === '/resources'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
          aria-expanded={resourcesOpen}
          aria-haspopup="true"
        >
          Resources
          <svg
            className={`h-4 w-4 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {/* Desktop: floating dropdown */}
        <div className="hidden md:block">
          {resourcesOpen && (
            <ResourcesMegaMenu
              variant="dropdown"
              onClose={() => setResourcesOpen(false)}
            />
          )}
        </div>
      </div>
      <Link
        href="/pricing"
        onClick={closeAll}
        className={`rounded-lg px-3 py-2 text-sm transition-colors ${
          router.pathname === '/pricing' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
        }`}
      >
        Pricing
      </Link>
      <Link
        href="/contact"
        onClick={closeAll}
        className={`rounded-lg px-3 py-2 text-sm transition-colors ${
          router.pathname === '/contact' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
        }`}
      >
        Contact
      </Link>
    </>
  )

  return (
    <header className="sticky top-0 z-50 overflow-visible border-b border-zinc-800/50 bg-[#0a0a0b]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 overflow-visible px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">Cutnary</span>
        </Link>

        {/* Desktop nav - overflow-visible so dropdown isn't clipped */}
        <nav className="hidden items-center gap-1 md:flex md:overflow-visible">{navOrder}</nav>

        {/* Auth / user */}
        <div className="flex shrink-0 items-center gap-2">
          {isAuthenticated && (
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen((o) => !o)}
                className="relative rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                aria-label="Notifications"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-80 max-h-96 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl">
                  <div className="border-b border-zinc-800 px-4 py-2">
                    <p className="text-sm font-medium text-white">Notifications</p>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-zinc-500">No notifications</p>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          if (!n.read) markAsRead(n.id)
                          setNotificationsOpen(false)
                        }}
                        className={`block w-full px-4 py-3 text-left text-sm transition-colors hover:bg-zinc-800 ${
                          n.read ? 'text-zinc-400' : 'text-white font-medium'
                        }`}
                      >
                        {n.message}
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-sm font-medium text-white">
                  {user?.profilePictureUrl ? (
                    <img src={user.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    user?.initials ?? user?.email?.slice(0, 2).toUpperCase() ?? '?'
                  )}
                </div>
                <span className="hidden sm:inline">{user?.name ?? user?.email ?? 'User'}</span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 z-50 mt-1 w-52 rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl">
                  <div className="border-b border-zinc-800 px-4 py-2">
                    <p className="truncate text-sm font-medium text-white">
                      {user?.name ?? user?.fullName ?? user?.email ?? 'User'}
                    </p>
                    <p className="truncate text-xs text-zinc-500">{user?.email}</p>
                  </div>
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
                    Profile
                  </Link>
                  <Link
                    href="/social"
                    className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Social
                  </Link>
                  <Link
                    href="/billing"
                    className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Billing
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false)
                      logout()
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="hidden text-sm text-zinc-400 transition-colors hover:text-white sm:block"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-400"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white md:hidden"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile: accordion menu */}
      {mobileMenuOpen && (
        <div className="border-t border-zinc-800 bg-zinc-900/95 px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2">
            <Link
              href="/"
              onClick={closeAll}
              className="rounded-lg px-3 py-2.5 text-sm text-white"
            >
              Home
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  href="/library"
                  onClick={closeAll}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-white"
                >
                  Library {libraryCount > 0 && `(${libraryCount})`}
                </Link>
                <Link href="/social" onClick={closeAll} className="rounded-lg px-3 py-2.5 text-sm text-white">
                  Social
                </Link>
                <Link href="/settings" onClick={closeAll} className="rounded-lg px-3 py-2.5 text-sm text-white">
                  Profile
                </Link>
                <Link href="/billing" onClick={closeAll} className="rounded-lg px-3 py-2.5 text-sm text-white">
                  Billing
                </Link>
              </>
            )}
            <div>
              <button
                type="button"
                onClick={toggleResources}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-white"
              >
                Resources
                <svg
                  className={`h-4 w-4 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {resourcesOpen && (
                <ResourcesMegaMenu
                  variant="accordion"
                  onClose={() => setResourcesOpen(false)}
                />
              )}
            </div>
            <Link href="/pricing" onClick={closeAll} className="rounded-lg px-3 py-2.5 text-sm text-white">
              Pricing
            </Link>
            <Link href="/contact" onClick={closeAll} className="rounded-lg px-3 py-2.5 text-sm text-white">
              Contact
            </Link>
            {!isAuthenticated && (
              <>
                <Link href="/auth/login" onClick={closeAll} className="rounded-lg px-3 py-2.5 text-sm text-white">
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  onClick={closeAll}
                  className="rounded-lg bg-blue-600 px-3 py-2.5 text-center text-sm font-medium text-white"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
