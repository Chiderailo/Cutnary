import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '@/context/AuthContext'
import { apiFetch, apiJson } from '@/lib/api'

interface Notification {
  id: number
  type?: string
  message: string
  read: boolean
  createdAt: string
}

function formatNotificationTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function notificationKind(type: string | undefined): { title: string; dot: string } {
  switch (type) {
    case 'post_success':
      return { title: 'Posted', dot: 'bg-emerald-500' }
    case 'post_failed':
      return { title: 'Post failed', dot: 'bg-red-500' }
    case 'posts_scheduled':
      return { title: 'Scheduled', dot: 'bg-amber-400' }
    case 'clips_ready':
      return { title: 'Clips ready', dot: 'bg-violet-500' }
    default:
      return { title: 'Notice', dot: 'bg-zinc-500' }
  }
}

/** Shown in the center nav when signed in. */
const authenticatedNavItems = [
  { href: '/library', label: 'Library' },
  { href: '/social', label: 'Social' },
] as const

/** Marketing + Resources — hidden for signed-in users (they use app nav instead). */
const aboutContactNav = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact Us' },
] as const

const marketingNavItems = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  {
    label: 'Resources',
    children: [
      { href: '/resources#stories', label: 'Customer Stories' },
      { href: '/resources#guides', label: 'Guides & Tutorials' },
      { href: '/resources#faq', label: 'FAQ' },
      { href: '/resources#changelog', label: 'Changelog' },
    ],
  },
  ...aboutContactNav,
] as const

function isActive(pathname: string, href?: string) {
  if (!href) return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function Header() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const resourcesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMobileOpen(false)
    setUserMenuOpen(false)
    setNotificationsOpen(false)
    setResourcesOpen(false)
  }, [router.pathname])

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (userMenuRef.current && !userMenuRef.current.contains(target)) setUserMenuOpen(false)
      if (notificationsRef.current && !notificationsRef.current.contains(target)) setNotificationsOpen(false)
      if (resourcesRef.current && !resourcesRef.current.contains(target)) setResourcesOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    const fetchNotifications = () => {
      apiJson<{ success: boolean; notifications?: Notification[] }>('/api/notifications')
        .then((data) => {
          if (data.success) setNotifications(data.notifications ?? [])
        })
        .catch(() => {})
    }
    fetchNotifications()
    const timer = setInterval(fetchNotifications, 30000)
    return () => clearInterval(timer)
  }, [isAuthenticated])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = async (id: number) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch {}
  }

  const markAllNotificationsRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {}
  }

  const centerMarketingItems = isAuthenticated ? [...aboutContactNav] : [...marketingNavItems]

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0a0a0b]">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Cutnary</span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated && (
            <Link
              href="/dashboard"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(router.pathname, '/dashboard')
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              Dashboard
            </Link>
          )}
          {isAuthenticated &&
            authenticatedNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(router.pathname, item.href)
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          {centerMarketingItems.map((item) => (
            item.children ? (
              <div key={item.label} className="relative" ref={resourcesRef}>
                <button
                  type="button"
                  onClick={() => setResourcesOpen((v) => !v)}
                  className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                    router.pathname.startsWith('/resources')
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  {item.label}
                  <svg className={`h-4 w-4 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {resourcesOpen && (
                  <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-zinc-800 bg-zinc-900 py-1 shadow-2xl animate-dropdown-fade">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href!}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive(router.pathname, item.href)
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!isAuthenticated ? (
            <>
              <Link
                href="/auth/login"
                className="hidden rounded-lg px-4 py-2 text-sm text-zinc-300 transition-colors hover:text-white sm:inline-flex"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
              >
                Get Started
              </Link>
            </>
          ) : (
            <>
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((v) => !v)}
                  className="relative rounded-lg p-2 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
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
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-[22rem] max-h-[min(24rem,70vh)] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl ring-1 ring-white/[0.04]">
                    <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">Notifications</p>
                        <p className="text-[11px] text-zinc-500">Posting, scheduling, and clips</p>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => void markAllNotificationsRead()}
                          className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/15 hover:text-violet-200"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="max-h-[min(20rem,60vh)] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-zinc-500">You&apos;re all caught up.</p>
                      ) : (
                        notifications.slice(0, 20).map((n) => {
                          const kind = notificationKind(n.type)
                          return (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => {
                                if (!n.read) void markAsRead(n.id)
                              }}
                              className={`flex w-full gap-3 border-b border-zinc-800/60 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-zinc-900/80 ${
                                n.read ? 'opacity-90' : ''
                              }`}
                            >
                              <span
                                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${kind.dot} ${
                                  n.read ? 'opacity-40' : ''
                                }`}
                                aria-hidden
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                    {kind.title}
                                  </span>
                                  <span className="shrink-0 text-[10px] tabular-nums text-zinc-600">
                                    {formatNotificationTime(n.createdAt)}
                                  </span>
                                </div>
                                <p className={`mt-1 text-sm leading-snug ${n.read ? 'text-zinc-400' : 'text-zinc-100'}`}>
                                  {n.message}
                                </p>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-violet-600 text-xs font-semibold text-white">
                    {user?.profilePictureUrl ? (
                      <img src={user.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      user?.initials ?? user?.email?.slice(0, 2).toUpperCase() ?? 'U'
                    )}
                  </div>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-zinc-800 bg-zinc-900 py-1 shadow-2xl">
                    <div className="px-4 py-3">
                      <p className="truncate text-sm font-medium text-white">{user?.name ?? user?.fullName ?? 'User'}</p>
                      <p className="truncate text-xs text-zinc-500">{user?.email}</p>
                    </div>
                    <div className="my-1 border-t border-zinc-800" />
                    <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white">
                      ⚙️ Settings
                    </Link>
                    {user?.role === 'admin' && (
                      <Link href="/admin" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white">
                        🔧 Admin
                      </Link>
                    )}
                    <div className="my-1 border-t border-zinc-800" />
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false)
                        logout()
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
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

      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-black px-6 py-8 md:hidden overflow-y-auto">
          <nav className="flex h-full flex-col gap-3">
            {isAuthenticated && (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className={`rounded-xl px-4 py-3 text-base font-semibold ${
                  isActive(router.pathname, '/dashboard')
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-white hover:bg-zinc-900'
                }`}
              >
                Dashboard
              </Link>
            )}
            {isAuthenticated &&
              authenticatedNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-xl px-4 py-3 text-base font-medium ${
                    isActive(router.pathname, item.href)
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            {centerMarketingItems.map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <div className="flex flex-col gap-2">
                    <div className="px-4 py-3 text-base font-semibold text-zinc-500 uppercase tracking-wider">
                      {item.label}
                    </div>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className={`rounded-xl px-4 py-3 text-base ${
                          isActive(router.pathname, child.href)
                            ? 'bg-violet-500/20 text-violet-300'
                            : 'text-zinc-200 hover:bg-zinc-900'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href!}
                    onClick={() => setMobileOpen(false)}
                    className={`rounded-xl px-4 py-3 text-base ${
                      isActive(router.pathname, item.href)
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
            {isAuthenticated ? (
              <>
                <Link href="/settings" onClick={() => setMobileOpen(false)} className="rounded-xl px-4 py-3 text-base text-zinc-200 hover:bg-zinc-900">
                  ⚙️ Settings
                </Link>
                {user?.role === 'admin' && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)} className="rounded-xl px-4 py-3 text-base text-zinc-200 hover:bg-zinc-900">
                    🔧 Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false)
                    logout()
                  }}
                  className="mt-auto rounded-xl border border-zinc-700 px-4 py-3 text-left text-base text-zinc-200 hover:border-zinc-500"
                >
                  🚪 Sign Out
                </button>
              </>
            ) : (
              <div className="mt-auto flex flex-col gap-3">
                <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="rounded-xl px-4 py-3 text-base text-zinc-200 hover:bg-zinc-900">
                  Sign In
                </Link>
                <Link href="/auth/register" onClick={() => setMobileOpen(false)} className="rounded-xl bg-violet-600 px-4 py-3 text-center text-base font-medium text-white hover:bg-violet-500">
                  Get Started
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
