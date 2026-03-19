/**
 * Cutnary – AI Video Clipper
 * Unique design: asymmetric layout, gradient mesh, focused YouTube-only flow
 */

import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import Header from '@/components/Header'
import ClipCard, { type ClipData } from '@/components/ClipCard'

const API_BASE = 'http://localhost:3333'
const POLL_INTERVAL_MS = 3000
const YOUTUBE_OEMBED = 'https://www.youtube.com/oembed'

type JobStatus =
  | 'queued'
  | 'downloading'
  | 'transcribing'
  | 'detecting_clips'
  | 'generating_clips'
  | 'adding_subtitles'
  | 'completed'
  | 'failed'

type FlowStep = 1 | 2 | 3 | 4 | 5

const ASPECT_RATIOS = [
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '4:5', label: '4:5' },
] as const

const CLIP_LENGTHS = [
  { value: 'auto', label: 'Auto (<90s)' },
  { value: '<30s', label: '<30s' },
  { value: '30-60s', label: '30s-60s' },
  { value: '60-90s', label: '60s-90s' },
  { value: '90-3min', label: '90s-3min' },
  { value: '>3min', label: '>3min' },
] as const

const CAPTION_STYLES = [
  { value: 'none', label: 'None' },
  { value: 'simple', label: 'Simple' },
  { value: 'bold', label: 'Bold' },
  { value: 'karaoke', label: 'Karaoke' },
  { value: 'glitch', label: 'Glitch' },
] as const

interface YouTubeOEmbed {
  title: string
  author_name: string
  thumbnail_url: string
  thumbnail_width: number
  thumbnail_height: number
}

interface JobResponse {
  success: boolean
  job?: {
    id: string
    status: JobStatus
    clips?: ClipData[]
    error?: string
  }
}

interface ProcessVideoResponse {
  success: boolean
  job_id?: string
  status?: string
}

interface ClipsResponse {
  success: boolean
  clips: ClipData[]
  status: JobStatus
}

const PROGRESS_STEPS = [
  { key: 'downloading', label: 'Downloading', status: 'downloading' as const },
  { key: 'transcribing', label: 'Transcribing', status: 'transcribing' as const },
  { key: 'detecting', label: 'Detecting', status: 'detecting_clips' as const },
  { key: 'generating', label: 'Generating', status: 'generating_clips' as const },
  { key: 'done', label: 'Done', status: 'completed' as const },
]

export default function Home() {
  const [step, setStep] = useState<FlowStep>(1)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoPreview, setVideoPreview] = useState<YouTubeOEmbed | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [urlInputFocused, setUrlInputFocused] = useState(false)
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [clipLength, setClipLength] = useState('auto')
  const [captionStyle, setCaptionStyle] = useState('simple')
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [clips, setClips] = useState<ClipData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [jobError, setJobError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchVideoPreview = useCallback(async (url: string) => {
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const res = await fetch(
        `${YOUTUBE_OEMBED}?url=${encodeURIComponent(url)}&format=json`
      )
      if (!res.ok) throw new Error('Invalid or unsupported YouTube URL')
      const data: YouTubeOEmbed = await res.json()
      setVideoPreview(data)
      setStep(3)
    } catch (err) {
      setPreviewError(
        err instanceof Error ? err.message : 'Could not load video preview'
      )
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = videoUrl.trim()
    if (!trimmed) {
      setPreviewError('Please enter a YouTube URL')
      return
    }
    fetchVideoPreview(trimmed)
  }

  const handleGenerateClips = async () => {
    if (!videoUrl.trim()) return
    setError(null)
    setClips([])
    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/process-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: videoUrl.trim(),
          aspect_ratio: aspectRatio,
          clip_length: clipLength,
          caption_style: captionStyle,
        }),
      })
      const data: ProcessVideoResponse = await res.json()
      if (!data.success || !data.job_id) {
        setError('Failed to start processing')
        return
      }
      setJobId(data.job_id)
      setStatus('queued')
      setStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const pollJob = useCallback(async (id: string): Promise<JobStatus | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/job/${id}`)
      const data: JobResponse = await res.json()
      if (!data.success || !data.job) {
        setError(data.job?.error ?? 'Failed to fetch job')
        return null
      }
      setStatus(data.job.status)
      if (data.job.error) setJobError(data.job.error)
      if (data.job.clips?.length) {
        setClips(
          data.job.clips.map((c) => ({
            id: c.id,
            url: c.url,
            startTime: c.startTime ?? (c as { start_time?: number }).start_time,
            endTime: c.endTime ?? (c as { end_time?: number }).end_time,
            description: c.description,
          }))
        )
      }
      return data.job.status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Poll failed')
      return null
    }
  }, [])

  useEffect(() => {
    if (!jobId) return
    let cancelled = false
    const run = async () => {
      let s = await pollJob(jobId)
      while (!cancelled && s !== 'completed' && s !== 'failed' && s != null) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
        if (cancelled) return
        s = await pollJob(jobId)
      }
    }
    run()
    return () => { cancelled = true }
  }, [jobId, pollJob])

  useEffect(() => {
    if (status === 'completed') setStep(5)
  }, [status])

  useEffect(() => {
    if (status === 'completed' && jobId && clips.length === 0) {
      fetch(`${API_BASE}/api/clips/${jobId}`)
        .then((r) => r.json())
        .then((data: ClipsResponse) => {
          if (data.success && data.clips?.length) {
            setClips(
              data.clips.map((c) => ({
                id: c.id,
                url: c.url,
                startTime: c.startTime ?? (c as { start_time?: number }).start_time,
                endTime: c.endTime ?? (c as { end_time?: number }).end_time,
                description: c.description,
              }))
            )
          }
        })
        .catch(() => {})
    }
  }, [status, jobId, clips.length])

  const handleReset = () => {
    setStep(1)
    setVideoUrl('')
    setVideoPreview(null)
    setPreviewError(null)
    setJobId(null)
    setStatus(null)
    setClips([])
    setError(null)
    setJobError(null)
  }

  const statusOrder = ['queued', 'downloading', 'transcribing', 'detecting_clips', 'generating_clips', 'adding_subtitles', 'completed']
  const displayStatus = status === 'adding_subtitles' ? 'generating_clips' : status
  const currentIndex = displayStatus ? statusOrder.indexOf(displayStatus) : -1

  const showSettings = step === 3 && videoPreview

  return (
    <>
      <Head>
        <title>Cutnary – AI Video Clipper</title>
        <meta name="description" content="Turn YouTube videos into viral clips with AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="relative min-h-screen overflow-hidden bg-[#0a0a0b]">
        {/* Gradient mesh background */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-purple-600/15 blur-[140px]" />
          <div className="absolute bottom-0 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-[100px]" />
        </div>

        <Header />

        <main className="relative mx-auto max-w-4xl px-6 py-16 sm:px-8 lg:py-24">
          {/* Hero – asymmetric split layout */}
          <section className="mb-16 lg:mb-20">
            <div className="lg:grid lg:grid-cols-[1fr_1.2fr] lg:gap-16 lg:items-start">
              <div className="mb-10 lg:mb-0 lg:pt-4">
                <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Turn long videos
                  <br />
                  <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                    into viral clips
                  </span>
                </h1>
                <p className="mt-6 max-w-sm text-lg text-zinc-500">
                  Paste a YouTube link. Configure once. Get shareable clips in minutes.
                </p>
              </div>

              <div>
                <form onSubmit={handleUrlSubmit}>
                  <div
                    className={`relative rounded-2xl border bg-zinc-900/60 py-4 pl-5 pr-4 
                      transition-all duration-300 ${
                      urlInputFocused
                        ? 'border-violet-500/60 shadow-[0_0_0_1px_rgba(139,92,246,0.3),0_0_40px_rgba(139,92,246,0.15)]'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800">
                        <svg className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      </div>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => {
                          setVideoUrl(e.target.value)
                          setPreviewError(null)
                        }}
                        onFocus={() => setUrlInputFocused(true)}
                        onBlur={() => setUrlInputFocused(false)}
                        placeholder="https://youtube.com/watch?v=..."
                        disabled={previewLoading}
                        className="min-w-0 flex-1 bg-transparent text-white placeholder-zinc-600 
                          outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      {videoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setVideoUrl('')
                            setVideoPreview(null)
                            setPreviewError(null)
                            setStep(1)
                          }}
                          className="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
                          aria-label="Clear"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={previewLoading}
                        className="shrink-0 rounded-xl bg-violet-600 px-5 py-2.5 font-medium text-white 
                          transition-all hover:bg-violet-500 disabled:opacity-50"
                      >
                        {previewLoading ? 'Loading…' : 'Continue'}
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-zinc-500">
                    YouTube links only for now
                  </p>
                  {previewError && (
                    <p className="mt-2 text-sm text-red-400">{previewError}</p>
                  )}
                </form>
              </div>
            </div>
          </section>

          {/* Video preview + Settings – single card */}
          {showSettings && (
            <section className="mb-16">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm sm:p-8">
                {videoPreview && (
                  <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-800 sm:max-w-[280px]">
                      <img
                        src={videoPreview.thumbnail_url}
                        alt={videoPreview.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-white">{videoPreview.title}</h3>
                      <p className="mt-1 text-sm text-zinc-500">{videoPreview.author_name}</p>
                      <p className="mt-2 text-xs text-zinc-600">Ready for AI clipping</p>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                    <AspectRatioDropdown
                      value={aspectRatio}
                      onChange={setAspectRatio}
                    />
                    <ClipLengthDropdown
                      value={clipLength}
                      onChange={setClipLength}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Caption style
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                      {CAPTION_STYLES.map((s) => (
                        <CaptionStyleCard
                          key={s.value}
                          value={s.value}
                          label={s.label}
                          selected={captionStyle === s.value}
                          onSelect={() => setCaptionStyle(s.value)}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateClips}
                    disabled={isSubmitting}
                    className="mt-4 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-4 
                      font-semibold text-white shadow-lg shadow-violet-500/20 transition-all 
                      hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-violet-500/30 
                      disabled:opacity-50"
                  >
                    {isSubmitting ? 'Starting…' : 'Generate clips'}
                  </button>
                  {error && <p className="text-center text-sm text-red-400">{error}</p>}
                </div>
              </div>
            </section>
          )}

          {/* Progress */}
          {step === 4 && (
            <section className="mb-16">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 backdrop-blur-sm">
                <p className="mb-6 text-sm font-medium text-zinc-500">Processing</p>
                <div className="space-y-2">
                  {PROGRESS_STEPS.map((s, i) => {
                    const stepStatusIndex = statusOrder.indexOf(s.status)
                    const isCompleted =
                      currentIndex > stepStatusIndex ||
                      (s.status === 'completed' && status === 'completed')
                    const isCurrent =
                      displayStatus === s.status ||
                      (status === 'adding_subtitles' && s.status === 'generating_clips') ||
                      (status === 'queued' && i === 0)
                    const isFailed = status === 'failed'

                    return (
                      <div
                        key={s.key}
                        className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
                          isCompleted
                            ? 'text-violet-400'
                            : isCurrent
                              ? 'animate-pulse bg-violet-500/10 text-violet-300'
                              : isFailed
                                ? 'text-red-400'
                                : 'text-zinc-500'
                        }`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center text-sm">
                          {isCompleted ? '✓' : '○'}
                        </span>
                        <span>{s.label}</span>
                      </div>
                    )
                  })}
                </div>
                {status === 'failed' && (
                  <>
                    {jobError && <p className="mt-4 text-sm text-red-400">{jobError}</p>}
                    <button
                      onClick={handleReset}
                      className="mt-4 rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                    >
                      Try again
                    </button>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Results */}
          {step === 5 && clips.length > 0 && (
            <section className="mb-16">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Your clips</h2>
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white"
                >
                  New video
                </button>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {clips.map((clip) => (
                  <ClipCard key={clip.id} clip={clip} />
                ))}
              </div>
            </section>
          )}

          {step === 5 && clips.length === 0 && status === 'completed' && (
            <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
              <p className="text-zinc-500">No clips were generated.</p>
              <button
                onClick={handleReset}
                className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white"
              >
                Try again
              </button>
            </section>
          )}
        </main>
      </div>
    </>
  )
}

function AspectRatioIcon({ ratio }: { ratio: string }) {
  const baseClass = 'shrink-0 rounded border border-current'
  switch (ratio) {
    case '9:16':
      return <div className={`h-5 w-3 ${baseClass}`} />
    case '1:1':
      return <div className={`h-4 w-4 ${baseClass}`} />
    case '16:9':
      return <div className={`h-3 w-5 ${baseClass}`} />
    case '4:5':
      return <div className={`h-4 w-3.5 ${baseClass}`} />
    default:
      return <div className={`h-5 w-3 ${baseClass}`} />
  }
}

function AspectRatioDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = ASPECT_RATIOS.find((r) => r.value === value) ?? ASPECT_RATIOS[0]

  return (
    <div className="relative">
      <label className="mb-2 block text-sm text-zinc-500">Choose aspect ratio</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex min-w-[140px] items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/80 
          px-4 py-3 text-left text-white transition-colors hover:border-zinc-600 focus:border-violet-500 
          focus:outline-none focus:ring-1 focus:ring-violet-500/50"
      >
        <AspectRatioIcon ratio={value} />
        <span className="flex-1">{selected.label}</span>
        <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-zinc-700 
          bg-zinc-900 py-1 shadow-xl">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => {
                onChange(r.value)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors 
                ${value === r.value
                  ? 'bg-violet-600/20 text-violet-400'
                  : 'text-zinc-300 hover:bg-zinc-800'}`}
            >
              {value === r.value ? (
                <svg className="h-4 w-4 shrink-0 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="w-4" />
              )}
              <AspectRatioIcon ratio={r.value} />
              <span>{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ClipLengthDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = CLIP_LENGTHS.find((l) => l.value === value) ?? CLIP_LENGTHS[0]

  return (
    <div className="relative">
      <label className="mb-2 block text-sm text-zinc-500">Clip length</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex min-w-[160px] items-center justify-between rounded-lg border border-zinc-700 
          bg-zinc-800/80 px-4 py-3 text-left text-white transition-colors hover:border-zinc-600 
          focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
      >
        <span>{selected.label}</span>
        <svg className="h-4 w-4 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-zinc-700 
          bg-zinc-900 py-1 shadow-xl">
          {CLIP_LENGTHS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => {
                onChange(l.value)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors 
                ${value === l.value
                  ? 'bg-violet-600/20 text-violet-400'
                  : 'text-zinc-300 hover:bg-zinc-800'}`}
            >
              {value === l.value ? (
                <svg className="h-4 w-4 shrink-0 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="w-4 shrink-0" />
              )}
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CaptionStyleCard({
  value,
  label,
  selected,
  onSelect,
}: {
  value: string
  label: string
  selected: boolean
  onSelect: () => void
}) {
  const SAMPLE = 'TO GET STARTED'
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-left transition-all ${
        selected
          ? 'border-violet-500 bg-violet-500/10'
          : 'border-zinc-800 bg-zinc-800/50 hover:border-zinc-600'
      }`}
    >
      <div className="flex h-9 w-full items-center justify-center rounded-lg bg-black/40">
        {value === 'none' && <span className="text-xs text-zinc-600">None</span>}
        {value === 'simple' && <span className="text-xs font-medium text-white">{SAMPLE}</span>}
        {value === 'bold' && (
          <span className="text-xs font-black text-white">{SAMPLE}</span>
        )}
        {value === 'karaoke' && (
          <span className="text-xs font-bold text-white">
            <span className="rounded bg-violet-500/60 px-1">{SAMPLE.split(' ')[0]}</span>{' '}
            {SAMPLE.split(' ').slice(1).join(' ')}
          </span>
        )}
        {value === 'glitch' && (
          <span className="text-xs font-bold text-cyan-400" style={{ textShadow: '2px 0 #ff00de, -2px 0 #00fff2' }}>
            {SAMPLE}
          </span>
        )}
      </div>
      <span className="text-xs text-zinc-500">{label}</span>
    </button>
  )
}
