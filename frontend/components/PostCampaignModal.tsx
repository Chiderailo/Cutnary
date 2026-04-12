/**
 * PostCampaignModal - Full-screen modal for posting multiple clips to social
 */

import { useEffect, useState } from 'react'
import { getLibrary, type LibraryEntry, type LibraryClip } from '@/lib/library'
import { apiFetch, apiJson, parseResponseJson } from '@/lib/api'
import HashtagSuggestions from './HashtagSuggestions'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube Shorts', icon: '▶️' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'instagram', label: 'Instagram Reels', icon: '📸' },
  { id: 'facebook', label: 'Facebook', icon: '👤' },
] as const

const LIMITS = {
  tiktok: 2200,
  instagram: 2200,
  youtube_title: 100,
  youtube_desc: 5000,
  facebook: 63206,
}

function toAbsoluteUrl(url: string): string {
  if (url.startsWith('http')) return url
  return url.startsWith('/') ? `${API_BASE}${url}` : `${API_BASE}/${url}`
}

function formatDuration(duration?: number): string {
  if (duration == null) return '—'
  const m = Math.floor(duration / 60)
  const s = Math.round(duration % 60)
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

interface FlatClip {
  key: string
  entry: LibraryEntry
  clip: LibraryClip
}

interface SocialAccount {
  id: number
  platform: string
  accountName: string | null
}

export default function PostCampaignModal({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<LibraryEntry[]>([])
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [selectedClipKeys, setSelectedClipKeys] = useState<Set<string>>(new Set())
  const [platforms, setPlatforms] = useState<Set<string>>(new Set())
  const [scheduleMode, setScheduleMode] = useState<'now' | 'smart' | 'custom'>('now')
  const [delayMinutes, setDelayMinutes] = useState(1)
  const [captions, setCaptions] = useState<Record<string, string>>({})
  const [hashtagsByClip, setHashtagsByClip] = useState<Record<string, string[]>>({})
  const [customTimes, setCustomTimes] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedClip, setExpandedClip] = useState<string | null>(null)

  useEffect(() => {
    setEntries(getLibrary())
    apiJson<{ success: boolean; accounts: SocialAccount[] }>('/api/social/accounts').then((data) => {
      if (data.success && data.accounts) setAccounts(data.accounts)
    })
  }, [])

  const flatClips: FlatClip[] = []
  entries.forEach((entry) => {
    if (entry.clips && entry.type !== 'transcript') {
      entry.clips.forEach((clip, i) => {
        const key = `${entry.id}-${i}-${clip.url}`
        flatClips.push({ key, entry, clip })
      })
    }
  })

  const selectedClips = flatClips.filter((c) => selectedClipKeys.has(c.key))
  const connectedPlatforms = new Set(accounts.map((a) => a.platform))

  const toggleClip = (key: string) => {
    setSelectedClipKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectAll = () => setSelectedClipKeys(new Set(flatClips.map((c) => c.key)))
  const deselectAll = () => setSelectedClipKeys(new Set())

  const togglePlatform = (id: string) => {
    if (!connectedPlatforms.has(id)) return
    setPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getCaption = (key: string) =>
    captions[key] ?? flatClips.find((c) => c.key === key)?.clip.viralDescription ?? 'Check this out!'

  const setCaption = (key: string, value: string) => {
    setCaptions((prev) => ({ ...prev, [key]: value }))
  }

  const getHashtags = (key: string) => hashtagsByClip[key] ?? []
  const toggleHashtag = (key: string, tag: string) => {
    setHashtagsByClip((prev) => {
      const arr = prev[key] ?? []
      const next = arr.includes(tag) ? arr.filter((t) => t !== tag) : [...arr, tag]
      return { ...prev, [key]: next }
    })
  }

  const applyCaptionToAll = () => {
    const first = selectedClips[0]
    if (!first) return
    const cap = getCaption(first.key)
    const tags = getHashtags(first.key)
    setCaptions((prev) => {
      const next = { ...prev }
      selectedClips.forEach((c) => {
        next[c.key] = cap
      })
      return next
    })
    setHashtagsByClip((prev) => {
      const next = { ...prev }
      selectedClips.forEach((c) => {
        next[c.key] = tags
      })
      return next
    })
  }

  const getSchedulePreview = () => {
    if (scheduleMode === 'custom') return null
    const start = new Date()
    return selectedClips.map((c, i) => {
      const t = new Date(start.getTime() + (scheduleMode === 'smart' ? i * delayMinutes : i) * 60 * 1000)
      return `Clip ${i + 1} → ${t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    })
  }

  const handleSubmit = async () => {
    if (selectedClips.length === 0) {
      setError('Select at least one clip')
      return
    }
    if (platforms.size === 0) {
      setError('Select at least one platform')
      return
    }
    // Custom schedule uses defaults if not set
    setError(null)
    setSubmitting(true)

    const clips = selectedClips.map((c, i) => {
      let scheduledAt: string | undefined
      if (scheduleMode === 'custom') {
        const raw = customTimes[c.key] ?? new Date(Date.now() + (i + 1) * 60 * 60 * 1000).toISOString().slice(0, 16)
        scheduledAt = new Date(raw).toISOString()
      } else {
        const start = new Date()
        const mins = scheduleMode === 'smart' ? i * delayMinutes : i
        scheduledAt = new Date(start.getTime() + mins * 60 * 1000).toISOString()
      }
      const caption = getCaption(c.key)
      const tags = getHashtags(c.key)
      return {
        clip_url: toAbsoluteUrl(c.clip.url),
        thumbnail_url: c.clip.thumbnailUrl ? toAbsoluteUrl(c.clip.thumbnailUrl) : undefined,
        caption,
        hashtags: tags.length ? tags : ['viral', 'trending', 'fyp', 'reels'],
        platforms: Array.from(platforms),
        scheduled_at: scheduledAt,
      }
    })

    try {
      setProgress('Scheduling campaign…')
      const res = await apiFetch('/api/social/campaign', {
        method: 'POST',
        body: JSON.stringify({
          clips,
          smart_delay: scheduleMode === 'smart',
          delay_minutes: delayMinutes,
        }),
      })
      const data = await parseResponseJson<{ success: boolean; created?: number[]; error?: string }>(res)
      if (data.success) {
        setProgress(`✅ ${data.created?.length ?? 0} posts scheduled!`)
        setTimeout(() => onClose(), 1500)
      } else {
        setError(data.error ?? 'Failed to create campaign')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0b] animate-in slide-in-from-right-full duration-300">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 px-6">
        <h2 className="text-xl font-bold text-white">📤 Post Clips Campaign</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* 1. CLIP SELECTOR */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Clips</h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-sm text-violet-400 hover:text-violet-300"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-sm text-violet-400 hover:text-violet-300"
                >
                  Deselect All
                </button>
                <span className="text-sm text-zinc-500">
                  {selectedClipKeys.size} clips selected
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {flatClips.map(({ key, entry, clip }) => (
                <label
                  key={key}
                  className={`flex cursor-pointer flex-col overflow-hidden rounded-xl border transition-all ${
                    selectedClipKeys.has(key)
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                  }`}
                >
                  <div className="relative aspect-video bg-zinc-800">
                    {clip.thumbnailUrl ? (
                      <img
                        src={clip.thumbnailUrl.startsWith('http') ? clip.thumbnailUrl : toAbsoluteUrl(clip.thumbnailUrl)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <video
                        src={toAbsoluteUrl(clip.url)}
                        muted
                        className="h-full w-full object-cover"
                        preload="metadata"
                      />
                    )}
                    <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white">
                      {formatDuration(clip.duration)}
                    </div>
                    <div className="absolute right-2 top-2">
                      <input
                        type="checkbox"
                        checked={selectedClipKeys.has(key)}
                        onChange={() => toggleClip(key)}
                        className="h-4 w-4 rounded border-zinc-600"
                      />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm text-zinc-300">
                      {clip.viralDescription ?? clip.description ?? 'No description'}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{entry.videoTitle}</p>
                  </div>
                </label>
              ))}
            </div>
            {flatClips.length === 0 && (
              <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-6 py-12 text-center text-zinc-500">
                No clips in library. Add videos first.
              </p>
            )}
          </section>

          {/* 2. PLATFORM SELECTOR */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-white">Platforms</h3>
            <div className="flex flex-wrap gap-3">
              {PLATFORMS.map((p) => {
                const connected = connectedPlatforms.has(p.id)
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-3 transition-colors ${
                      platforms.has(p.id) ? 'border-violet-500 bg-violet-500/20' : 'border-zinc-700 bg-zinc-800/50'
                    } ${!connected ? 'opacity-50' : 'cursor-pointer'}`}
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
                    {!connected && (
                      <a href="/social" className="text-xs text-violet-400 hover:underline">
                        Connect
                      </a>
                    )}
                  </label>
                )
              })}
            </div>
          </section>

          {/* 3. POSTING SCHEDULE */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-white">Schedule</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'now' as const, label: 'Post Now (1 min between)' },
                { id: 'smart' as const, label: 'Smart Delay' },
                { id: 'custom' as const, label: 'Custom Schedule' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScheduleMode(opt.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    scheduleMode === opt.id ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {scheduleMode === 'smart' && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-zinc-500">Every</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Math.max(1, Math.min(60, Number(e.target.value))))}
                  className="w-16 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-white"
                />
                <span className="text-sm text-zinc-500">minutes</span>
              </div>
            )}
            {getSchedulePreview() && getSchedulePreview()!.length > 0 && (
              <div className="mt-3 space-y-1 rounded-lg bg-zinc-800/50 p-3">
                {getSchedulePreview()!.slice(0, 5).map((line, i) => (
                  <p key={i} className="text-sm text-zinc-400">
                    {line}
                  </p>
                ))}
                {getSchedulePreview()!.length > 5 && (
                  <p className="text-sm text-zinc-500">...and {getSchedulePreview()!.length - 5} more</p>
                )}
              </div>
            )}
            {scheduleMode === 'custom' && selectedClips.length > 0 && (
              <div className="mt-3 space-y-2">
                {selectedClips.map(({ key, clip }, i) => {
                  const defaultTime = new Date(Date.now() + (i + 1) * 60 * 60 * 1000)
                  const defaultValue = defaultTime.toISOString().slice(0, 16)
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-24 truncate text-sm text-zinc-400">{clip.viralDescription?.slice(0, 20) ?? 'Clip'}</span>
                      <input
                        type="datetime-local"
                        value={customTimes[key] ?? defaultValue}
                        onChange={(e) => setCustomTimes((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* 4. CAPTION EDITOR */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Captions</h3>
              {selectedClips.length > 0 && (
                <button
                  type="button"
                  onClick={applyCaptionToAll}
                  className="text-sm text-violet-400 hover:text-violet-300"
                >
                  Apply to all clips
                </button>
              )}
            </div>
            <div className="space-y-2">
              {selectedClips.map(({ key, clip }) => (
                <div
                  key={key}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedClip(expandedClip === key ? null : key)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-zinc-800">
                        {clip.thumbnailUrl ? (
                          <img
                            src={clip.thumbnailUrl.startsWith('http') ? clip.thumbnailUrl : toAbsoluteUrl(clip.thumbnailUrl)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <video src={toAbsoluteUrl(clip.url)} muted className="h-full w-full object-cover" preload="metadata" />
                        )}
                      </div>
                      <div>
                        <p className="line-clamp-1 text-sm font-medium text-white">
                          {clip.viralDescription ?? clip.description ?? 'No caption'}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {getCaption(key).length} chars · {getHashtags(key).length} hashtags
                        </p>
                      </div>
                    </div>
                    <svg
                      className={`h-5 w-5 text-zinc-500 transition-transform ${expandedClip === key ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedClip === key && (
                    <div className="border-t border-zinc-800 p-4 space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-medium text-zinc-500">Caption</label>
                        <textarea
                          value={getCaption(key)}
                          onChange={(e) => setCaption(key, e.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-violet-500 focus:outline-none"
                          placeholder="Write your caption..."
                        />
                        <p className="mt-1 text-xs text-zinc-500">
                          TikTok/IG: {getCaption(key).length}/2200 · YouTube: {getCaption(key).slice(0, 100).length}/100
                        </p>
                      </div>
                      <HashtagSuggestions
                        content={getCaption(key)}
                        platform="tiktok"
                        selected={getHashtags(key)}
                        onToggle={(tag) => toggleHashtag(key, tag)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {progress && <p className="text-sm text-green-400">{progress}</p>}

          {/* 5. POST BUTTON */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedClips.length === 0 || platforms.size === 0}
              className="rounded-xl bg-violet-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-violet-500 disabled:opacity-50"
            >
              {submitting ? 'Scheduling…' : '🚀 Start Posting Campaign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
