/**
 * Cutnary – AI Video Clipper
 * Unique design: asymmetric layout, gradient mesh, focused YouTube-only flow
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Header from '@/components/Header'
import ClipCard, { type ClipData } from '@/components/ClipCard'
import { apiFetch, apiJson } from '@/lib/api'
import { addToLibrary, getLibrary, getYouTubeThumbnail } from '@/lib/library'
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
type ToolMode = 'clips' | 'transcript' | null

type TranscriptStatus = 'queued' | 'downloading' | 'transcribing' | 'completed' | 'failed'

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
  error?: string
}

interface ClipsResponse {
  success: boolean
  clips: ClipData[]
  status: JobStatus
}

const PROGRESS_MAP: Record<JobStatus, { percent: number; label: string }> = {
  queued: { percent: 5, label: 'Queued...' },
  downloading: { percent: 20, label: 'Downloading video...' },
  transcribing: { percent: 40, label: 'Transcribing audio...' },
  detecting_clips: { percent: 60, label: 'Detecting viral moments...' },
  generating_clips: { percent: 80, label: 'Generating clips...' },
  adding_subtitles: { percent: 90, label: 'Adding subtitles...' },
  completed: { percent: 100, label: '✓ Done! Your clips are ready' },
  failed: { percent: 0, label: 'Failed' },
}

export default function Home() {
  const router = useRouter()
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
  const [savedToLibrary, setSavedToLibrary] = useState(false)
  const [toolMode, setToolMode] = useState<ToolMode>(null)
  const [transcriptJobId, setTranscriptJobId] = useState<string | null>(null)
  const [transcriptStatus, setTranscriptStatus] = useState<TranscriptStatus | null>(null)
  const [transcriptLanguage, setTranscriptLanguage] = useState('en')
  const [speakerSeparation, setSpeakerSeparation] = useState(true)
  const [transcriptError, setTranscriptError] = useState<string | null>(null)
  const [transcriptSubmitting, setTranscriptSubmitting] = useState(false)
  const previewRef = useRef<HTMLElement | null>(null)

  const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
  ]

  const fetchVideoPreview = useCallback(async (url: string) => {
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const res = await fetch(`${YOUTUBE_OEMBED}?url=${encodeURIComponent(url)}&format=json`)
      if (!res.ok) throw new Error('Invalid or unsupported YouTube URL')
      const data: YouTubeOEmbed = await res.json()
      setVideoPreview(data)
      setStep(3)
      requestAnimationFrame(() => {
        previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
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

  const handleGenerateTranscript = async () => {
    if (!videoUrl.trim()) return
    setTranscriptError(null)
    setTranscriptSubmitting(true)
    try {
      const res = await apiFetch('/api/transcript', {
        method: 'POST',
        body: JSON.stringify({
          video_url: videoUrl.trim(),
          language: transcriptLanguage,
          speaker_separation: speakerSeparation,
          video_title: videoPreview?.title ?? 'Untitled',
        }),
      })
      const data = await res.json().then((d: { success?: boolean; job_id?: string; error?: string }) => {
        if (!res.ok) throw new Error(d.error ?? 'Request failed')
        return d
      })
      if (!data.success || !data.job_id) {
        setTranscriptError(data.error ?? 'Failed to start')
        return
      }
      setTranscriptJobId(data.job_id)
      setTranscriptStatus('queued')
    } catch (err) {
      setTranscriptError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setTranscriptSubmitting(false)
    }
  }

  const pollTranscript = useCallback(async (id: string) => {
    try {
      const data = await apiJson<{ success: boolean; status: TranscriptStatus; job_id?: string }>(`/api/transcript/${id}`)
      setTranscriptStatus(data.status)
      if (data.status === 'completed') router.push(`/transcript/${id}`)
      if (data.status === 'failed') setTranscriptError('Transcript failed')
      return data.status
    } catch {
      return null
    }
  }, [router])

  useEffect(() => {
    if (!transcriptJobId || transcriptStatus === 'completed' || transcriptStatus === 'failed') return
    const t = setInterval(() => pollTranscript(transcriptJobId), POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [transcriptJobId, transcriptStatus, pollTranscript])

  const handleGenerateClips = async () => {
    if (!videoUrl.trim()) return
    setError(null)
    setClips([])
    setIsSubmitting(true)
    try {
      const payload = {
        video_url: videoUrl.trim(),
        aspect_ratio: aspectRatio,
        clip_length: clipLength,
        language: 'en',
      }
      console.log('Sending job:', payload)
      const res = await apiFetch('/api/process-video', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const data = await res.json().then((d: ProcessVideoResponse) => {
        if (!res.ok) throw new Error((d as { error?: string }).error ?? 'Request failed')
        return d
      })
      if (!data.success || !data.job_id) {
        setError(data.error ?? 'Failed to start processing')
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
      const data = await apiJson<JobResponse>(`/api/job/${id}`)
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
            viralDescription: (c as { viralDescription?: string }).viralDescription,
            score: (c as { score?: number }).score,
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

  // Save to library when job completes (once per job)
  const savedJobRef = useRef<string | null>(null)
  useEffect(() => {
    if (status !== 'completed' || !jobId || !videoUrl || clips.length === 0 || !videoPreview) return
    if (savedJobRef.current === jobId) return
    savedJobRef.current = jobId
    const thumb = videoPreview.thumbnail_url || getYouTubeThumbnail(videoUrl)
    addToLibrary({
      id: jobId,
      videoUrl,
      videoTitle: videoPreview.title,
      thumbnail: thumb,
      createdAt: new Date().toISOString(),
      status: 'completed',
      aspectRatio,
      clipLength,
      clips: clips.map((c) => ({
        url: c.url,
        score: typeof c.score === 'number' ? c.score : undefined,
        description: c.description,
        viralDescription: c.viralDescription,
        duration: c.startTime != null && c.endTime != null ? c.endTime - c.startTime : undefined,
        startTime: c.startTime,
        endTime: c.endTime,
        id: c.id,
      })),
    })
    setSavedToLibrary(true)
  }, [status, jobId, videoUrl, clips, videoPreview, aspectRatio, clipLength])

  // Load job from ?job= query (View Clips from Library)
  useEffect(() => {
    const jobParam = router.query.job
    const id = typeof jobParam === 'string' ? jobParam : jobParam?.[0]
    if (!id) return
    apiFetch(`/api/job/${id}`)
      .then((r) => r.json())
      .then((data: JobResponse) => {
        if (data.success && data.job?.clips?.length) {
          setJobId(id)
          setStatus('completed')
          setClips(
            data.job.clips.map((c) => ({
              id: c.id,
              url: c.url,
              startTime: c.startTime ?? (c as { start_time?: number }).start_time,
              endTime: c.endTime ?? (c as { end_time?: number }).end_time,
              description: c.description,
              viralDescription: (c as { viralDescription?: string }).viralDescription,
              score: (c as { score?: number }).score,
            }))
          )
          setStep(5)
        }
      })
      .catch(() => {
        const lib = getLibrary()
        const entry = lib.find((e) => e.id === id)
        if (entry?.clips?.length) {
          setJobId(id)
          setStatus('completed')
          setClips(
            entry.clips.map((c, i) => ({
              id: c.id ?? `clip-${i}`,
              url: c.url,
              startTime: c.startTime,
              endTime: c.endTime,
              description: c.description,
              viralDescription: c.viralDescription,
              score: c.score,
            }))
          )
          setVideoPreview({
            title: entry.videoTitle,
            author_name: '',
            thumbnail_url: entry.thumbnail,
            thumbnail_width: 320,
            thumbnail_height: 180,
          })
          setVideoUrl(entry.videoUrl)
          setStep(5)
        }
      })
  }, [router.query.job])

  // Scroll to clips when loading from ?job=
  useEffect(() => {
    if (router.query.job && step === 5 && clips.length > 0) {
      requestAnimationFrame(() => {
        document.getElementById('clips')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [router.query.job, step, clips.length])

  useEffect(() => {
    if (status === 'completed' && jobId && clips.length === 0) {
      apiJson<ClipsResponse>(`/api/clips/${jobId}`)
        .then((data) => {
          if (data.success && data.clips?.length) {
            setClips(
              data.clips.map((c) => ({
                id: c.id,
                url: c.url,
                startTime: c.startTime ?? (c as { start_time?: number }).start_time,
                endTime: c.endTime ?? (c as { end_time?: number }).end_time,
                description: c.description,
                viralDescription: (c as { viralDescription?: string }).viralDescription,
                score: (c as { score?: number }).score,
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
    setToolMode(null)
    setTranscriptJobId(null)
    setTranscriptStatus(null)
    setTranscriptError(null)
  }

  const showToolsGrid = step === 3 && videoPreview && toolMode === null
  const showClipSettings = step === 3 && videoPreview && toolMode === 'clips'
  const showTranscriptSettings = step === 3 && videoPreview && toolMode === 'transcript'
  const showTranscriptProgress = transcriptJobId && transcriptStatus && transcriptStatus !== 'completed' && transcriptStatus !== 'failed'
  const showSettings = showClipSettings
  const showProgress = step === 4 || (step === 5 && status === 'completed')
  const progressInfo = status ? PROGRESS_MAP[status] ?? PROGRESS_MAP.queued : PROGRESS_MAP.queued
  const progressPercent = status === 'failed' ? 100 : progressInfo.percent

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
          {/* Hero – sticky URL input */}
          <section className="sticky top-16 z-10 mb-16 lg:mb-20">
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
                        className={`shrink-0 rounded-xl bg-violet-600 px-5 py-2.5 font-medium text-white 
                          transition-all hover:bg-violet-500 disabled:opacity-50
                          ${videoUrl.trim() ? 'animate-[pulse-subtle_2s_ease-in-out_infinite]' : ''}`}
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

          {/* Video preview – visible when we have a video and tools/settings/progress */}
          {(showToolsGrid || showSettings || showTranscriptSettings || showTranscriptProgress || showProgress) && videoPreview && (
            <section
              ref={previewRef}
              className="mb-8 animate-[fadeIn_0.4s_ease-out_forwards] opacity-0 [animation-fill-mode:forwards]"
            >
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
                    <p className="mt-2 text-xs text-zinc-600">
                      {showProgress ? 'Processing...' : showTranscriptProgress ? 'Generating transcript...' : 'Ready'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Tools grid – choose AI Clipping or Video Transcript */}
          {showToolsGrid && (
            <section className="mb-16">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">Choose a tool</h2>
                <p className="mt-1 text-sm text-zinc-500">What would you like to do with this video?</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setToolMode('clips')}
                  className="flex flex-col items-start rounded-2xl border-2 border-zinc-800 bg-zinc-900/60 p-6 text-left 
                    transition-all hover:border-violet-500/50 hover:bg-zinc-900/80"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20">
                    <svg className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 font-semibold text-white">AI Clipping</h3>
                  <p className="mt-2 text-sm text-zinc-500">Extract viral clips with AI. Choose aspect ratio and clip length.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setToolMode('transcript')}
                  className="flex flex-col items-start rounded-2xl border-2 border-zinc-800 bg-zinc-900/60 p-6 text-left 
                    transition-all hover:border-violet-500/50 hover:bg-zinc-900/80"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20">
                    <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 font-semibold text-white">Video Transcript</h3>
                  <p className="mt-2 text-sm text-zinc-500">Transcribe with speaker diarization. Separate who said what.</p>
                </button>
              </div>
            </section>
          )}

          {/* Transcript settings – when Video Transcript selected */}
          {showTranscriptSettings && (
            <section className="mb-16">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm sm:p-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Video Transcript</h2>
                  <button
                    type="button"
                    onClick={() => { setToolMode(null); setTranscriptError(null); setTranscriptStatus(null); setTranscriptJobId(null) }}
                    className="text-sm text-zinc-500 hover:text-white"
                  >
                    ← Change tool
                  </button>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">Language</label>
                    <select
                      value={transcriptLanguage}
                      onChange={(e) => setTranscriptLanguage(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white focus:border-violet-500 focus:outline-none"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Speaker separation</p>
                      <p className="text-sm text-zinc-500">Identify different speakers (Speaker 1, Speaker 2, etc.)</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={speakerSeparation}
                      onClick={() => setSpeakerSeparation((s) => !s)}
                      className={`relative h-7 w-12 rounded-full transition-colors ${speakerSeparation ? 'bg-violet-600' : 'bg-zinc-700'}`}
                    >
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${speakerSeparation ? 'left-7 translate-x-[-100%]' : 'left-1'}`} />
                    </button>
                  </div>
                  <button
                    onClick={handleGenerateTranscript}
                    disabled={transcriptSubmitting || showTranscriptProgress}
                    className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 font-semibold text-white 
                      shadow-lg transition-all hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
                  >
                    {transcriptSubmitting ? 'Starting…' : showTranscriptProgress ? `${transcriptStatus}…` : 'Generate Transcript'}
                  </button>
                  {transcriptError && <p className="text-center text-sm text-red-400">{transcriptError}</p>}
                </div>
              </div>
            </section>
          )}

          {/* Settings – step 3, AI Clipping selected */}
          {showSettings && (
            <section className="mb-16">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm sm:p-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">AI Clipping</h2>
                  <button
                    type="button"
                    onClick={() => setToolMode(null)}
                    className="text-sm text-zinc-500 hover:text-white"
                  >
                    ← Change tool
                  </button>
                </div>
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

          {/* Progress bar – step 4 */}
          {showProgress && (
            <section className="mb-16">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-[width_0.5s_ease-out]"
                      style={{
                        width: `${progressPercent}%`,
                        background: status === 'failed'
                          ? 'linear-gradient(90deg, rgb(239 68 68), rgb(185 28 28))'
                          : status === 'completed'
                            ? 'linear-gradient(90deg, rgb(34 197 94), rgb(22 163 74))'
                            : 'linear-gradient(90deg, rgb(139 92 246), rgb(168 85 247))',
                        boxShadow: status === 'completed'
                          ? '0 0 12px rgba(34, 197, 94, 0.6)'
                          : status === 'failed'
                            ? 'none'
                            : '0 0 12px rgba(168, 85, 247, 0.5)',
                      }}
                    />
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium tabular-nums ${
                      status === 'failed' ? 'text-red-400' : status === 'completed' ? 'text-emerald-400' : 'text-zinc-400'
                    }`}
                  >
                    {status === 'failed' ? '—' : `${progressPercent}%`}
                  </span>
                </div>
                <p
                  className={`mt-3 text-sm ${
                    status === 'failed'
                      ? 'text-red-400'
                      : status === 'completed'
                        ? 'font-medium text-emerald-400'
                        : 'text-zinc-500'
                  }`}
                >
                  {status === 'failed' ? (jobError ?? 'Processing failed') : progressInfo.label}
                </p>
                {status === 'failed' && (
                  <button
                    onClick={handleReset}
                    className="mt-4 rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    Try again
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Saved to Library banner */}
          {step === 5 && savedToLibrary && clips.length > 0 && (
            <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <span className="text-sm font-medium text-emerald-400">✓ Saved to Library!</span>
              <Link
                href="/library"
                className="text-sm font-medium text-violet-400 hover:text-violet-300 hover:underline"
              >
                View in Library →
              </Link>
            </div>
          )}

          {/* Results – fades in when clips load */}
          {step === 5 && clips.length > 0 && (
            <section id="clips" className="mb-16 animate-[fadeIn_0.5s_ease-out_forwards] opacity-0 [animation-fill-mode:forwards]">
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
                  <ClipCard key={clip.id} clip={clip} jobId={jobId ?? undefined} />
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
