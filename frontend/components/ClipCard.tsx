/**
 * ClipCard - Displays a single generated clip with video preview and actions
 * Features: video player, duration badge, Edit, Download, AI Voice Explainer
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch, apiJson, parseResponseJson } from '@/lib/api'
import PostClipModal from './PostClipModal'

export interface ClipData {
  id: string
  url: string
  startTime?: number
  endTime?: number
  description?: string
  viralDescription?: string
  score?: number | string
  thumbnailUrl?: string
}

interface ClipCardProps {
  clip: ClipData
  score?: number
  jobId?: string
  clipIndex?: number
  canRemove?: boolean
  onRemoveClip?: (clipIndex: number) => void
}

const EXPLAINER_STYLES = [
  { value: 'commentary', label: 'Commentary' },
  { value: 'educational', label: 'Educational' },
  { value: 'funny', label: 'Funny' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'news', label: 'News' },
] as const

const VOICE_OPTIONS = {
  male: [
    { value: 'en-US-Neural2-J', label: 'Male (J)' },
    { value: 'en-US-Neural2-D', label: 'Male (D)' },
    { value: 'en-US-Neural2-I', label: 'Male (I)' },
  ],
  female: [
    { value: 'en-US-Neural2-F', label: 'Female (F)' },
    { value: 'en-US-Neural2-G', label: 'Female (G)' },
    { value: 'en-US-Neural2-H', label: 'Female (H)' },
  ],
} as const

const POLL_INTERVAL_MS = 2000

function formatDuration(start?: number, end?: number): string {
  if (start == null || end == null) return '—'
  const sec = Math.round(end - start)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

function scoreTier(score: number): { emoji: string; gradient: string } {
  if (score > 70) return { emoji: '🔥', gradient: 'from-violet-500 to-fuchsia-400' }
  if (score >= 40) return { emoji: '⚡', gradient: 'from-violet-600 to-indigo-500' }
  return { emoji: '📉', gradient: 'from-zinc-600 to-zinc-500' }
}

function clipFilename(url: string): string {
  try {
    const path = new URL(url, 'http://localhost').pathname
    return path.split('/').pop() || ''
  } catch {
    return url.split('/').pop() || ''
  }
}

export default function ClipCard({
  clip,
  score: scoreProp,
  jobId,
  clipIndex,
  canRemove,
  onRemoveClip,
}: ClipCardProps) {
  const jobIdStr = jobId != null ? String(jobId) : ''
  const duration = formatDuration(clip.startTime, clip.endTime)
  let scoreValue = 0
  try {
    const raw = scoreProp != null ? scoreProp : clip.score
    if (typeof raw === 'string') {
      const parsed = JSON.parse(raw)
      scoreValue = Number(parsed?.score) || 0
    } else {
      scoreValue = Number(raw) || 0
    }
  } catch {
    scoreValue = 0
  }
  const hasScore = scoreProp != null || clip.score != null
  const scoreDisplay = hasScore ? scoreTier(scoreValue) : null

  const [modalOpen, setModalOpen] = useState(false)
  const [explainerStyle, setExplainerStyle] = useState('commentary')
  const [explainerVoice, setExplainerVoice] = useState<'male' | 'female'>('male')
  const [explainerVoiceName, setExplainerVoiceName] = useState('en-US-Neural2-J')
  const [originalAudioVolume, setOriginalAudioVolume] = useState(20)
  const [explainerJobId, setExplainerJobId] = useState<string | null>(null)
  const [explainerStatus, setExplainerStatus] = useState<'idle' | 'queued' | 'completed' | 'failed'>('idle')
  const [explainerUrl, setExplainerUrl] = useState<string | null>(null)
  const [explainerScript, setExplainerScript] = useState<string | null>(null)
  const [explainerError, setExplainerError] = useState<string | null>(null)
  const [explainerSubmitting, setExplainerSubmitting] = useState(false)
  const [postModalOpen, setPostModalOpen] = useState(false)

  const pollExplainer = useCallback(async (id: string) => {
    try {
      const data = await apiJson<{ success: boolean; status: string; url?: string; script?: string; error?: string }>(
        `/api/explainer/${id}`
      )
      setExplainerStatus(data.status as 'queued' | 'completed' | 'failed')
      if (data.status === 'completed') {
        setExplainerUrl(data.url ?? null)
        setExplainerScript(data.script ?? null)
      }
      if (data.status === 'failed') {
        setExplainerError(data.error ?? 'Failed')
      }
      return data.status
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (!explainerJobId || explainerStatus === 'completed' || explainerStatus === 'failed') return
    const t = setInterval(() => pollExplainer(explainerJobId), POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [explainerJobId, explainerStatus, pollExplainer])

  const handleGenerateExplainer = async () => {
    setExplainerError(null)
    setExplainerSubmitting(true)
    try {
      const voice =
        (explainerVoice === 'male'
          ? VOICE_OPTIONS.male.find((v) => v.value === explainerVoiceName)
          : VOICE_OPTIONS.female.find((v) => v.value === explainerVoiceName)
        )?.value ?? (explainerVoice === 'male' ? 'en-US-Neural2-J' : 'en-US-Neural2-F')

      const res = await apiFetch('/api/explainer', {
        method: 'POST',
        body: JSON.stringify({
          clipUrl: clip.url,
          style: explainerStyle,
          voice,
          originalAudioVolume: originalAudioVolume / 100,
        }),
      })
      const data = await parseResponseJson<{ success?: boolean; job_id?: string; error?: string }>(res)
      if (!data.success || !data.job_id) {
        setExplainerError(data.error ?? 'Failed to start')
        return
      }
      setExplainerJobId(data.job_id)
      setExplainerStatus('queued')
    } catch (err) {
      setExplainerError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setExplainerSubmitting(false)
    }
  }

  const handleDownloadExplainer = () => {
    if (!explainerUrl) return
    const a = document.createElement('a')
    a.href = explainerUrl
    a.download = `clip-${clip.id}-explainer.mp4`
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    if (explainerStatus === 'completed' || explainerStatus === 'failed') {
      setExplainerJobId(null)
      setExplainerStatus('idle')
      setExplainerUrl(null)
      setExplainerScript(null)
      setExplainerError(null)
    }
  }

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = clip.url
    a.download = `clip-${clip.id}.mp4`
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }

  return (
    <>
      <div
        className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/40 
                   ring-1 ring-white/[0.04] backdrop-blur-sm transition-all duration-300 hover:border-violet-500/25
                   hover:shadow-lg hover:shadow-violet-950/20"
      >
        <div className="relative aspect-video w-full bg-zinc-900">
          <video
            src={clip.url}
            controls
            playsInline
            poster={clip.thumbnailUrl}
            className="h-full w-full object-contain"
            preload="metadata"
          />
          <div className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {duration}
          </div>
        </div>

        <div className="p-4">
          {(clip.viralDescription ?? clip.description) && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Social Caption
              </p>
              <p className="text-base font-medium leading-snug text-white line-clamp-2">
                {clip.viralDescription ?? clip.description}
              </p>
            </div>
          )}

          <div className="space-y-2">
            {(jobIdStr || (canRemove && typeof clipIndex === 'number' && onRemoveClip)) && (
              <div className="flex gap-2">
                {jobIdStr && (
                  <Link
                    href={`/editor/${jobIdStr}?clip=${encodeURIComponent(clipFilename(clip.url))}`}
                    className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700/90 
                               bg-zinc-900/60 px-3 py-2 text-sm font-medium text-zinc-100 ring-1 ring-white/[0.04]
                               transition-all duration-200 hover:border-violet-500/35 hover:bg-zinc-800/80"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                    Edit
                  </Link>
                )}
                {canRemove && typeof clipIndex === 'number' && onRemoveClip && (
                  <button
                    onClick={() => {
                      if (!window.confirm('Remove this clip from your library?')) return
                      onRemoveClip(clipIndex)
                    }}
                    className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/40 
                               bg-zinc-900/40 px-3 py-2 text-sm font-medium text-red-300/95 transition-all duration-200 
                               hover:border-red-400/60 hover:bg-red-950/30"
                    type="button"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-3h4m-4 0a1 1 0 00-1 1v0a1 1 0 001 1h4a1 1 0 001-1v0a1 1 0 00-1-1m-5 4v10m4-10v10" />
                    </svg>
                    Remove
                  </button>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-zinc-700/90 
                           bg-zinc-900/60 px-3 py-2 text-sm font-medium text-zinc-100 ring-1 ring-white/[0.04]
                           transition-all duration-200 hover:border-violet-500/35 hover:bg-zinc-800/80"
              >
                <span className="shrink-0" aria-hidden>🎙️</span>
                Add AI Voice
              </button>
              <button
                type="button"
                onClick={() => setPostModalOpen(true)}
                aria-label="Share clip to social"
                className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-zinc-700/90 
                           bg-zinc-900/60 px-3 py-2 text-sm font-medium text-zinc-100 ring-1 ring-white/[0.04]
                           transition-all duration-200 hover:border-violet-500/35 hover:bg-zinc-800/80"
              >
                <span className="shrink-0" aria-hidden>📤</span>
                Share
              </button>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 
                         text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition-all duration-200 
                         hover:bg-violet-500 hover:shadow-violet-500/25 active:scale-[0.99]"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </button>
          </div>

          {scoreDisplay && (
            <div
              className="mt-4 rounded-xl border border-zinc-800/90 bg-black/25 px-3 py-3 ring-1 ring-white/[0.04]"
              role="group"
              aria-label={`Viral score ${scoreValue} out of 100`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Viral score
                </span>
                <span className="flex items-center gap-1.5 tabular-nums">
                  <span className="text-base" aria-hidden>
                    {scoreDisplay.emoji}
                  </span>
                  <span className="text-sm font-semibold text-zinc-100">
                    {scoreValue}
                    <span className="font-medium text-zinc-500">/100</span>
                  </span>
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/90 ring-1 ring-inset ring-white/[0.06]">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${scoreDisplay.gradient}`}
                  style={{ width: `${Math.min(100, Math.max(0, scoreValue))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
        >
          <div
            className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border 
                       border-zinc-700 bg-zinc-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Add AI Voice Explainer</h3>
              <button
                onClick={handleCloseModal}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {explainerStatus === 'idle' || explainerStatus === 'queued' ? (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Style
                  </label>
                  <select
                    value={explainerStyle}
                    onChange={(e) => setExplainerStyle(e.target.value)}
                    disabled={explainerSubmitting || explainerStatus === 'queued'}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white
                               focus:border-blue-500 focus:outline-none disabled:opacity-60"
                  >
                    {EXPLAINER_STYLES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Voice
                  </label>
                  <div className="mb-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setExplainerVoice('male')
                        setExplainerVoiceName('en-US-Neural2-J')
                      }}
                      disabled={explainerSubmitting || explainerStatus === 'queued'}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors
                        ${explainerVoice === 'male' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExplainerVoice('female')
                        setExplainerVoiceName('en-US-Neural2-F')
                      }}
                      disabled={explainerSubmitting || explainerStatus === 'queued'}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors
                        ${explainerVoice === 'female' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                      Female
                    </button>
                  </div>
                  <select
                    value={explainerVoiceName}
                    onChange={(e) => setExplainerVoiceName(e.target.value)}
                    disabled={explainerSubmitting || explainerStatus === 'queued'}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white
                               focus:border-blue-500 focus:outline-none disabled:opacity-60"
                  >
                    {VOICE_OPTIONS[explainerVoice].map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Original audio volume: {originalAudioVolume}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={originalAudioVolume}
                    onChange={(e) => setOriginalAudioVolume(Number(e.target.value))}
                    disabled={explainerSubmitting || explainerStatus === 'queued'}
                    className="w-full accent-blue-500 disabled:opacity-60"
                  />
                </div>

                <button
                  onClick={handleGenerateExplainer}
                  disabled={explainerSubmitting || explainerStatus === 'queued'}
                  className="w-full rounded-xl bg-blue-600 py-4 font-semibold text-white shadow-lg
                             transition-all hover:bg-blue-500 disabled:opacity-50"
                >
                  {explainerSubmitting
                    ? 'Starting…'
                    : explainerStatus === 'queued'
                      ? 'Generating explainer…'
                      : 'Generate Explainer'}
                </button>

                {explainerStatus === 'queued' && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-3 text-sm text-blue-400">
                    <svg
                      className="h-5 w-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    AI is analyzing the video and generating voiceover…
                  </div>
                )}

                {explainerError && (
                  <p className="text-center text-sm text-red-400">{explainerError}</p>
                )}
              </div>
            ) : explainerStatus === 'completed' && explainerUrl ? (
              <div className="space-y-4">
                <video
                  src={explainerUrl}
                  controls
                  playsInline
                  className="w-full rounded-lg bg-black"
                />
                {explainerScript && (
                  <div className="rounded-lg bg-zinc-800/50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Script
                    </p>
                    <p className="text-sm text-zinc-300">{explainerScript}</p>
                  </div>
                )}
                <button
                  onClick={handleDownloadExplainer}
                  className="w-full rounded-xl bg-blue-600 py-4 font-semibold text-white shadow-lg
                             transition-all hover:bg-blue-500"
                >
                  Download Explainer
                </button>
                <button
                  onClick={handleCloseModal}
                  className="w-full rounded-lg border border-zinc-600 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  Close
                </button>
              </div>
            ) : explainerStatus === 'failed' ? (
              <div className="space-y-4">
                <p className="text-center text-red-400">{explainerError ?? 'Generation failed'}</p>
                <button
                  onClick={() => {
                    setExplainerStatus('idle')
                    setExplainerError(null)
                    setExplainerJobId(null)
                  }}
                  className="w-full rounded-xl border border-zinc-600 py-3 text-white hover:bg-zinc-800"
                >
                  Try again
                </button>
                <button
                  onClick={handleCloseModal}
                  className="w-full rounded-lg py-2 text-zinc-400 hover:text-white"
                >
                  Close
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {postModalOpen && (
        <PostClipModal clip={clip} onClose={() => setPostModalOpen(false)} />
      )}
    </>
  )
}
