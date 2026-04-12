/**
 * PostClipModal - Post clip to social platforms (YouTube, TikTok, Instagram, Facebook)
 */

import { useEffect, useState } from 'react'
import { apiFetch, apiJson, parseResponseJson } from '@/lib/api'
import type { ClipData } from './ClipCard'
import HashtagSuggestions from './HashtagSuggestions'

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube Shorts', icon: '▶️' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'instagram', label: 'Instagram Reels', icon: '📸' },
  { id: 'facebook', label: 'Facebook Reels', icon: '👤' },
] as const

interface PostClipModalProps {
  clip: ClipData
  onClose: () => void
}

interface SocialAccount {
  id: number
  platform: string
  accountName: string | null
  profilePictureUrl: string | null
  followerCount: number | null
}

export default function PostClipModal({ clip, onClose }: PostClipModalProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [platforms, setPlatforms] = useState<Set<string>>(new Set())
  const [title, setTitle] = useState(clip.viralDescription ?? clip.description ?? 'Check this out!')
  const [description, setDescription] = useState(clip.viralDescription ?? clip.description ?? '')
  const [hashtagList, setHashtagList] = useState<string[]>(['viral', 'trending', 'fyp', 'reels', 'shorts'])
  const [scheduleNow, setScheduleNow] = useState(true)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('12:00')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<Array<{ platform: string; postId?: number; error?: string }> | null>(null)

  useEffect(() => {
    apiJson<{ success: boolean; accounts: SocialAccount[] }>('/api/social/accounts')
      .then((data) => {
        if (data.success && data.accounts) setAccounts(data.accounts)
      })
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false))
  }, [])

  const togglePlatform = (id: string) => {
    setPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async () => {
    if (platforms.size === 0) {
      setError('Select at least one platform')
      return
    }
    if (!scheduleNow && (!scheduleDate || !scheduleTime)) {
      setError('Select date and time for scheduled post')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || ''
      const clipUrl = clip.url.startsWith('http') ? clip.url : `${base}${clip.url.startsWith('/') ? clip.url : `/${clip.url}`}`
      const res = await apiFetch('/api/social/post', {
        method: 'POST',
        body: JSON.stringify({
          clip_url: clipUrl,
          thumbnail_url: clip.thumbnailUrl,
          platforms: Array.from(platforms),
          title,
          description,
          hashtags: hashtagList,
          schedule_time: scheduleNow ? null : new Date(`${scheduleDate}T${scheduleTime}`).toISOString(),
        }),
      })
      const data = await parseResponseJson<{ success: boolean; results?: typeof results }>(res)
      if (data.success && data.results) {
        setResults(data.results)
      } else {
        setError((data as { error?: string }).error ?? 'Post failed')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleHashtag = (tag: string) => {
    setHashtagList((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="mx-4 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Post to Social</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {results ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">Post results:</p>
            {results.map((r) => (
              <div
                key={r.platform}
                className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                  r.error ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                }`}
              >
                <span className="font-medium">{PLATFORMS.find((p) => p.id === r.platform)?.label ?? r.platform}</span>
                {r.error ? <span className="text-sm">{r.error}</span> : <span className="text-sm">✓ Published</span>}
              </div>
            ))}
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-blue-600 py-3 font-medium text-white hover:bg-blue-500"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                Platforms
              </label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const connected = accounts.some((a) => a.platform === p.id)
                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 transition-colors ${
                        platforms.has(p.id)
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      } ${!connected ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={platforms.has(p.id)}
                        onChange={() => connected && togglePlatform(p.id)}
                        disabled={!connected}
                        className="rounded"
                      />
                      <span>{p.icon}</span>
                      <span className="text-sm text-white">{p.label}</span>
                      {!connected && <span className="text-xs text-zinc-500">(connect in Social)</span>}
                    </label>
                  )
                })}
              </div>
              {!loading && accounts.length === 0 && (
                <p className="mt-2 text-sm text-amber-400">
                  Connect accounts at{' '}
                  <a href="/social" className="underline hover:text-amber-300">
                    /social
                  </a>
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Video title"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                Caption / Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Caption for your post"
              />
            </div>

            <HashtagSuggestions
              content={description || title}
              platform="tiktok"
              selected={hashtagList}
              onToggle={toggleHashtag}
            />

            <div>
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={scheduleNow}
                  onClick={() => setScheduleNow(true)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    scheduleNow ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  Post Now
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!scheduleNow}
                  onClick={() => setScheduleNow(false)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    !scheduleNow ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  Schedule
                </button>
              </div>
              {!scheduleNow && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white"
                  />
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white"
                  />
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting || platforms.size === 0}
              className="w-full rounded-xl bg-blue-600 py-4 font-semibold text-white shadow-lg transition-all hover:bg-blue-500 disabled:opacity-50"
            >
              {submitting ? 'Posting…' : scheduleNow ? 'Post Now' : 'Schedule'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
