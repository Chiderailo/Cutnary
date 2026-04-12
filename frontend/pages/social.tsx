/**
 * Social Media Hub - Connected accounts, post history, scheduled posts, analytics
 */

import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Header from '@/components/Header'
import { apiFetch, apiJson, parseResponseJson } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube Shorts', icon: '▶️', color: 'bg-red-600', connectLabel: 'Connect YouTube' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: 'bg-black', connectLabel: 'Connect TikTok' },
  {
    id: 'instagram',
    label: 'Instagram Reels',
    icon: '📸',
    color: 'bg-gradient-to-br from-purple-600 to-pink-500',
    connectLabel: 'Connect Instagram',
  },
  {
    id: 'facebook',
    label: 'Facebook Reels',
    icon: '👤',
    color: 'bg-blue-600',
    connectLabel: 'Connect Facebook Page',
  },
] as const

interface SocialAccount {
  id: number
  platform: string
  accountId: string | null
  accountName: string | null
  profilePictureUrl: string | null
  followerCount: number | null
}

interface SocialPost {
  id: number
  platform: string
  clipUrl: string
  thumbnailUrl?: string | null
  caption?: string | null
  status: string
  externalUrl?: string | null
  error?: string | null
  views?: number | null
  likes?: number | null
  comments?: number | null
  scheduledAt?: string | null
  postedAt?: string | null
  createdAt?: string | null
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
function toAbsoluteUrl(url: string): string {
  if (url.startsWith('http')) return url
  return url.startsWith('/') ? `${API_BASE}${url}` : `${API_BASE}/${url}`
}

function RetryButton({ postId, onSuccess }: { postId: number; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const handleRetry = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/social/post/${postId}/retry`, { method: 'POST' })
      const data = await parseResponseJson<{ success?: boolean }>(res)
      if (data.success) onSuccess()
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }
  return (
    <button
      onClick={handleRetry}
      disabled={loading}
      className="rounded-lg border border-zinc-600 px-3 py-1 text-xs text-zinc-400 hover:border-violet-500 hover:text-violet-400 disabled:opacity-50"
    >
      {loading ? 'Retrying…' : 'Retry'}
    </button>
  )
}

const STATUS_BADGES: Record<string, { bg: string; label: string }> = {
  published: { bg: 'bg-green-500/20', label: '✅ Published' },
  scheduled: { bg: 'bg-amber-500/20', label: '⏰ Scheduled' },
  posting: { bg: 'bg-blue-500/20', label: '🔄 Posting' },
  pending: { bg: 'bg-zinc-500/20', label: '⏳ Pending' },
  failed: { bg: 'bg-red-500/20', label: '❌ Failed' },
}

export default function SocialPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [oauthTokenReady, setOauthTokenReady] = useState(false)
  const [activeTab, setActiveTab] = useState<'accounts' | 'history' | 'scheduled' | 'analytics'>('accounts')
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [scheduledPosts, setScheduledPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [platformStatus, setPlatformStatus] = useState<Record<string, boolean>>({
    youtube: false,
    tiktok: false,
    instagram: false,
    facebook: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const preOAuthToken = sessionStorage.getItem('pre_oauth_token')
    if (preOAuthToken && !localStorage.getItem('cutnary_token')) {
      localStorage.setItem('cutnary_token', preOAuthToken)
    }
    if (preOAuthToken) {
      sessionStorage.removeItem('pre_oauth_token')
    }
    setOauthTokenReady(true)
  }, [])

  useEffect(() => {
    if (!oauthTokenReady || authLoading) return
    if (!isAuthenticated) {
      router.replace(`/auth/login?redirect=${encodeURIComponent('/social')}`)
      return
    }
    loadData()
  }, [oauthTokenReady, authLoading, isAuthenticated, router])

  const loadData = () => {
    Promise.all([
      apiJson<{ success: boolean; accounts: SocialAccount[] }>('/api/social/accounts'),
      apiJson<{ success: boolean; posts: SocialPost[] }>('/api/social/posts'),
      apiJson<{ success: boolean; posts: SocialPost[] }>('/api/social/scheduled'),
      apiJson<Record<string, boolean>>('/api/social/platform-status'),
    ])
      .then(([accRes, postRes, schedRes, platformRes]) => {
        if (accRes.success && accRes.accounts) setAccounts(accRes.accounts)
        if (postRes.success && postRes.posts) setPosts(postRes.posts)
        if (schedRes.success && schedRes.posts) setScheduledPosts(schedRes.posts)
        setPlatformStatus({
          youtube: !!platformRes.youtube,
          tiktok: !!platformRes.tiktok,
          instagram: !!platformRes.instagram,
          facebook: !!platformRes.facebook,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const { connected, error } = router.query
    if (connected && typeof connected === 'string') {
      setMessage({ type: 'success', text: `Connected ${connected} successfully!` })
      setAccounts([])
      apiJson<{ success: boolean; accounts: SocialAccount[] }>('/api/social/accounts').then((data) => {
        if (data.success && data.accounts) setAccounts(data.accounts)
      })
      router.replace('/social', undefined, { shallow: true })
    }
    if (error && typeof error === 'string') {
      const decoded = decodeURIComponent(error)
      const friendly: Record<string, string> = {
        platform_not_configured: 'This platform is not configured yet. Please ask an admin.',
        youtube_denied: 'You denied YouTube access. Please try again and click Allow.',
        no_channel: 'No YouTube channel found on this Google account.',
        no_code: 'OAuth callback did not include a code. Please try connecting again.',
        invalid_state: 'OAuth session expired or was invalid. Please reconnect.',
      }
      setMessage({ type: 'error', text: friendly[decoded] ?? decoded })
      router.replace('/social', undefined, { shallow: true })
    }
  }, [router.query])

  const handleConnect = async (platform: string) => {
    setConnecting(platform)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('cutnary_token') : null
      if (token) {
        sessionStorage.setItem('pre_oauth_token', token)
      }
      const res = await apiFetch('/api/social/connect', {
        method: 'POST',
        body: JSON.stringify({ platform }),
      })
      const data = await parseResponseJson<{ success: boolean; url?: string; error?: string }>(res)
      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Failed to connect' })
        setConnecting(null)
      }
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Request failed' })
      setConnecting(null)
    }
  }

  const handleDisconnect = async (accountId: number) => {
    try {
      await apiFetch(`/api/social/accounts/${accountId}`, { method: 'DELETE' })
      setAccounts((prev) => prev.filter((a) => a.id !== accountId))
      setMessage({ type: 'success', text: 'Account disconnected' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to disconnect' })
    }
  }

  const filteredPosts = posts.filter((p) => {
    if (filterPlatform !== 'all' && p.platform !== filterPlatform) return false
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    return true
  })

  const tabs = [
    { id: 'accounts' as const, label: 'Connected Accounts' },
    { id: 'history' as const, label: 'Post History' },
    { id: 'scheduled' as const, label: 'Scheduled Posts' },
    { id: 'analytics' as const, label: 'Analytics' },
  ]

  if (!isAuthenticated) return null

  return (
    <>
      <Head>
        <title>Social Media – Cutnary</title>
        <meta name="description" content="Connect and manage your social media accounts" />
      </Head>

      <div className="min-h-screen bg-[#060607] text-zinc-100">
        <Header />
        
        {/* Ambient Glows */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        </div>

        <main className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="mb-10">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Social Media Hub</h1>
            <p className="mt-3 text-lg text-zinc-400">Manage your connected accounts and track your performance across platforms.</p>
          </div>

          {message && (
            <div
              className={`mb-8 flex items-center justify-between rounded-xl border px-5 py-4 backdrop-blur-md ${
                message.type === 'success' 
                  ? 'border-green-500/20 bg-green-500/10 text-green-400' 
                  : 'border-red-500/20 bg-red-500/10 text-red-400'
              }`}
            >
              <div className="flex items-center gap-3">
                {message.type === 'success' ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span>{message.text}</span>
              </div>
              <button onClick={() => setMessage(null)} className="text-sm font-medium hover:opacity-70">
                Dismiss
              </button>
            </div>
          )}

          <div className="mb-8 flex flex-wrap gap-1 p-1 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl w-fit">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`relative px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  activeTab === t.id
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="min-h-[400px]">
            {activeTab === 'accounts' && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid gap-6 sm:grid-cols-2">
                  {PLATFORMS.map((p) => {
                    const account = accounts.find((a) => a.platform === p.id)
                    const isAvailable = platformStatus?.[p.id] === true
                    const lastPost = posts
                      .filter((x) => x.platform === p.id && x.postedAt)
                      .sort((a, b) => new Date(b.postedAt!).getTime() - new Date(a.postedAt!).getTime())[0]
                    
                    return (
                      <div
                        key={p.id}
                        className={`group relative overflow-hidden rounded-3xl border p-6 transition-all duration-300 hover:shadow-2xl ${
                          account
                            ? 'border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-transparent'
                            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                        }`}
                      >
                        <div className="relative z-10 flex flex-col gap-6 h-full justify-between">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-5">
                              <div className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-lg transition-transform duration-300 group-hover:scale-110 ${p.color}`}>
                                {account?.profilePictureUrl ? (
                                  <img
                                    src={account.profilePictureUrl}
                                    alt=""
                                    className="h-full w-full rounded-2xl object-cover"
                                  />
                                ) : (
                                  p.icon
                                )}
                                {account && (
                                  <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 border-2 border-[#060607] text-[10px] text-white">
                                    ✓
                                  </div>
                                )}
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-white">{p.label}</h3>
                                {account ? (
                                  <div className="mt-1 flex flex-col gap-1">
                                    <p className="text-sm font-medium text-zinc-300">
                                      {account.accountName ?? account.accountId ?? 'Connected'}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                      {account.followerCount != null && (
                                        <span className="text-xs text-zinc-500">
                                          {account.followerCount.toLocaleString()} followers
                                        </span>
                                      )}
                                      <span className="text-xs text-zinc-500">
                                        {posts.filter((x) => x.platform === p.id).length} posts
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-1">
                                    <span className="text-sm text-zinc-500">
                                      {!isAvailable ? 'Coming Soon' : 'Not connected'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-zinc-800/50 pt-6">
                            <div className="text-xs text-zinc-500">
                              {account && lastPost?.postedAt && (
                                <span>Last post: {new Date(lastPost.postedAt).toLocaleDateString()}</span>
                              )}
                              {!account && isAvailable && (
                                <span>Connect to start posting</span>
                              )}
                            </div>
                            
                            {account ? (
                              <button
                                onClick={() => handleDisconnect(account.id)}
                                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                              >
                                Disconnect
                              </button>
                            ) : !isAvailable ? (
                              <div className="rounded-xl bg-zinc-800/50 px-4 py-2 text-sm font-medium text-zinc-600">
                                Unavailable
                              </div>
                            ) : (
                              <button
                                onClick={() => handleConnect(p.id)}
                                disabled={connecting !== null}
                                className="relative overflow-hidden rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-600/30 disabled:opacity-50"
                              >
                                {connecting === p.id ? 'Connecting…' : p.connectLabel ?? 'Connect'}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Decorative Gradient Background for Connected States */}
                        {account && (
                          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-16 translate-x-16 rounded-full bg-violet-600/10 blur-3xl" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {activeTab === 'history' && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-white">Post History</h2>
                  <div className="flex flex-wrap gap-3">
                    <select
                      value={filterPlatform}
                      onChange={(e) => setFilterPlatform(e.target.value)}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    >
                      <option value="all">All Platforms</option>
                      {PLATFORMS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    >
                      <option value="all">All Statuses</option>
                      {Object.entries(STATUS_BADGES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label.replace(/^[^\s]+\s/, '')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="flex h-64 items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900/40">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                  </div>
                ) : posts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900/40 py-20 text-center">
                    <div className="mb-4 text-4xl text-zinc-700">Empty</div>
                    <p className="text-zinc-500">No posts yet. Post a clip from the <Link href="/library" className="text-violet-400 hover:underline">library</Link> or home page.</p>
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900/40 py-20 text-center">
                    <p className="text-zinc-500">No matching posts found.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-900/60">
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Video</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Platform</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Status</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Performance</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Date</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {filteredPosts.map((post) => {
                            const platform = PLATFORMS.find((p) => p.id === post.platform)
                            const badge = STATUS_BADGES[post.status] || { bg: 'bg-zinc-500/20', label: post.status }
                            return (
                              <tr key={post.id} className="group hover:bg-zinc-800/30 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-4">
                                    <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                                      {post.thumbnailUrl ? (
                                        <img
                                          src={toAbsoluteUrl(post.thumbnailUrl)}
                                          alt=""
                                          className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-xl">🎞️</div>
                                      )}
                                    </div>
                                    <div className="max-w-[200px]">
                                      <p className="truncate text-sm font-semibold text-white">
                                        {post.caption || 'No caption'}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`flex h-6 w-6 items-center justify-center rounded-md text-xs ${platform?.color || 'bg-zinc-700'}`}>
                                      {platform?.icon || '?'}
                                    </span>
                                    <span className="text-sm text-zinc-300">{platform?.label || post.platform}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badge.bg.replace('/20', '/10')} border border-white/5`}>
                                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                                    {badge.label.replace(/^[^\s]+\s/, '')}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-zinc-400">
                                  {post.status === 'published' ? (
                                    <div className="flex items-center gap-3">
                                      <span title="Views">👁️ {post.views || 0}</span>
                                      <span title="Likes">❤️ {post.likes || 0}</span>
                                    </div>
                                  ) : (
                                    <span className="italic opacity-30">—</span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm text-zinc-400">
                                    {post.postedAt
                                      ? new Date(post.postedAt).toLocaleDateString()
                                      : post.scheduledAt
                                        ? `Scheduled: ${new Date(post.scheduledAt).toLocaleDateString()}`
                                        : new Date(post.createdAt!).toLocaleDateString()}
                                  </p>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    {post.externalUrl && (
                                      <a
                                        href={post.externalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-lg bg-zinc-800 p-2 text-zinc-400 hover:bg-violet-600 hover:text-white transition-all"
                                        title="View post"
                                      >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                      </a>
                                    )}
                                    {post.status === 'failed' && (
                                      <RetryButton postId={post.id} onSuccess={loadData} />
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'scheduled' && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="mb-6 text-2xl font-bold text-white">Upcoming Posts</h2>
                {scheduledPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900/40 py-20 text-center">
                    <p className="text-zinc-500">No scheduled posts. Use the Post Campaign from the <Link href="/library" className="text-violet-400 hover:underline">library</Link> to schedule.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {scheduledPosts.map((post) => {
                      const platform = PLATFORMS.find((p) => p.id === post.platform)
                      return (
                        <div key={post.id} className="group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40 transition-all hover:border-violet-500/50">
                          <div className="aspect-video relative w-full overflow-hidden bg-zinc-800">
                            {post.thumbnailUrl ? (
                              <img src={toAbsoluteUrl(post.thumbnailUrl)} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">🎞️</div>
                            )}
                            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-md">
                              <span className={`h-2 w-2 rounded-full ${platform?.color || 'bg-zinc-500'}`} />
                              {platform?.label}
                            </div>
                          </div>
                          <div className="p-5">
                            <p className="mb-4 line-clamp-2 text-sm text-zinc-300">
                              {post.caption || 'No caption'}
                            </p>
                            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
                              <div className="text-xs">
                                <p className="text-zinc-500 uppercase tracking-wider font-bold">Scheduled for</p>
                                <p className="font-semibold text-white">
                                  {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : 'Soon'}
                                </p>
                              </div>
                              <button className="text-xs font-bold text-violet-400 hover:text-violet-300">
                                Edit
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {activeTab === 'analytics' && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="mb-6 text-2xl font-bold text-white">Overall Analytics</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Total Posts', value: posts.filter(p => p.status === 'published').length, icon: '📈', color: 'from-blue-600/20' },
                    { label: 'Total Views', value: posts.reduce((acc, p) => acc + (p.views || 0), 0).toLocaleString(), icon: '👁️', color: 'from-violet-600/20' },
                    { label: 'Total Engagement', value: posts.reduce((acc, p) => acc + (p.likes || 0) + (p.comments || 0), 0).toLocaleString(), icon: '❤️', color: 'from-pink-600/20' },
                    { label: 'Scheduled', value: scheduledPosts.length, icon: '📅', color: 'from-emerald-600/20' },
                  ].map((stat, i) => (
                    <div key={i} className={`relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br ${stat.color} to-zinc-900/40 p-6`}>
                      <div className="relative z-10">
                        <p className="text-sm font-medium text-zinc-400">{stat.label}</p>
                        <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
                      </div>
                      <div className="absolute -right-2 -bottom-2 text-6xl opacity-10 grayscale">{stat.icon}</div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-10 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-violet-600/10 text-3xl">
                    📊
                  </div>
                  <h3 className="text-xl font-bold text-white">Advanced insights coming soon</h3>
                  <p className="mx-auto mt-2 max-w-md text-zinc-500">
                    We're working on deep analytics to help you understand which clips perform best and why.
                  </p>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
