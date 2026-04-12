/**
 * Cutnary – AI Video Clipper
 * Unique design: asymmetric layout, gradient mesh, focused YouTube-only flow
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Header from '@/components/Header'
import PostCampaignModal from '@/components/PostCampaignModal'
import ClipCard, { type ClipData } from '@/components/ClipCard'
import { apiFetch, apiJson, parseResponseJson } from '@/lib/api'
import { addToLibrary, getLibrary, getYouTubeThumbnail, getYouTubeVideoId, removeClipFromLibrary, updateLibraryEntry } from '@/lib/library'
import { useAuth } from '@/context/AuthContext'
import { CLIP_DASHBOARD_SCROLL_KEY, CLIP_DASHBOARD_SECTION_ID } from '@/lib/clip_dashboard'
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

const CLIP_LENGTH_MAP: Record<string, string> = {
  auto: 'auto',
  '30s': '30-60s',
  '60s': '60-90s',
  '90s': '90-3min',
}

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
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
  const [postCampaignOpen, setPostCampaignOpen] = useState(false)

  const previewRef = useRef<HTMLElement | null>(null)
  const prefsLoaded = useRef(false)
  const jobIdRef = useRef<string | null>(null)

  useEffect(() => {
    jobIdRef.current = jobId
  }, [jobId])

  useEffect(() => {
    if (!router.isReady || router.pathname !== '/dashboard') return
    if (typeof window === 'undefined' || sessionStorage.getItem(CLIP_DASHBOARD_SCROLL_KEY) !== '1') return
    sessionStorage.removeItem(CLIP_DASHBOARD_SCROLL_KEY)
    const t = window.setTimeout(() => {
      const target =
        document.getElementById(CLIP_DASHBOARD_SECTION_ID) ?? document.getElementById('clips')
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => clearTimeout(t)
  }, [router.isReady, router.pathname, router.asPath])

  useEffect(() => {
    if (!router.isReady || isLoading) return
    if (!isAuthenticated) {
      void router.replace('/auth/login?redirect=/dashboard')
    }
  }, [router.isReady, isLoading, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated || prefsLoaded.current) return
    prefsLoaded.current = true
    apiJson<{ success: boolean; preferences?: { default_aspect_ratio: string; default_clip_length: string; default_language: string } }>('/api/user/preferences')
      .then((data) => {
        if (data.success && data.preferences) {
          const p = data.preferences
          setAspectRatio(p.default_aspect_ratio)
          setClipLength(CLIP_LENGTH_MAP[p.default_clip_length] ?? p.default_clip_length)
          setTranscriptLanguage(p.default_language)
        }
      })
      .catch(() => {})
  }, [isAuthenticated])

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
      const text = await res.text()
      console.log('API response:', text)
      if (!res.ok) throw new Error('Invalid or unsupported YouTube URL')
      let data: YouTubeOEmbed
      try {
        data = JSON.parse(text) as YouTubeOEmbed
      } catch {
        console.error('API response was not JSON:', text)
        throw new Error('Invalid or unsupported YouTube URL')
      }
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
      const video_url = videoUrl.trim()
      const language = transcriptLanguage
      const speaker_separation = Boolean(speakerSeparation)
      const payload = {
        video_url,
        language,
        speaker_separation,
        video_title: videoPreview?.title ?? 'Untitled',
      }
      console.log('Submitting transcript job:', { video_url, language, speaker_separation })
      const res = await apiFetch('/api/transcript', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const data = await parseResponseJson<{ success?: boolean; job_id?: string; error?: string }>(res)
      if (!data.success || !data.job_id) {
        setTranscriptError(data.error ?? 'Failed to start')
        return
      }
      setTranscriptJobId(data.job_id)
      setTranscriptStatus('queued')

      const videoId = getYouTubeVideoId(video_url)
      const thumbnail = videoId
        ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        : '/placeholder-thumbnail.png'
      addToLibrary({
        id: data.job_id,
        type: 'transcript',
        videoUrl: video_url,
        videoTitle: videoPreview?.title ?? 'Untitled Video',
        thumbnail,
        createdAt: new Date().toISOString(),
        status: 'processing',
        language: transcriptLanguage,
        speakerSeparation,
      })
    } catch (err) {
      setTranscriptError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setTranscriptSubmitting(false)
    }
  }

  const pollTranscript = useCallback(async (id: string) => {
    try {
      const data = await apiJson<{
        success: boolean
        status: TranscriptStatus
        job_id?: string
        segments?: Array<{ speaker?: string }>
      }>(`/api/transcript/${id}`)
      setTranscriptStatus(data.status)
      if (data.status === 'completed') {
        const speakers = new Set((data.segments ?? []).map((s) => s.speaker).filter(Boolean))
        updateLibraryEntry(id, { status: 'completed', speakerCount: speakers.size || undefined })
        router.push(`/transcript/${id}`)
      }
      if (data.status === 'failed') {
        updateLibraryEntry(id, { status: 'failed' })
        setTranscriptError('Transcript failed')
      }
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
    setSavedToLibrary(false)
    setClips([])
    setJobId(null)
    setStatus(null)
    setJobError(null)
    jobIdRef.current = null
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
      const data = await parseResponseJson<ProcessVideoResponse>(res)
      if (!data.success || !data.job_id) {
        setError(data.error ?? 'Failed to start processing')
        return
      }
      const newJobId = data.job_id
      setJobId(newJobId)
      jobIdRef.current = newJobId
      setStatus('queued')
      setStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const pollJob = useCallback(async (id: string): Promise<JobStatus | null> => {
    const currentJobId = String(id)
    try {
      const data = await apiJson<JobResponse>(`/api/job/${id}`)
      if (!data.success || !data.job) {
        setError(data.job?.error ?? 'Failed to fetch job')
        return null
      }

      // Prevent older polls from updating state after a new job starts
      if (currentJobId !== jobIdRef.current) {
        return data.job.status
      }

      setStatus(data.job.status)
      if (data.job.error) setJobError(data.job.error)

      if (data.job.status === 'completed') {
        // Fetch clips ONLY for the current job (never rely on data.job.clips)
        const clipsRes = await apiJson<ClipsResponse>(`/api/clips/${currentJobId}`)
        if (jobIdRef.current !== currentJobId) return data.job.status

        const newClips =
          clipsRes.success && clipsRes.clips
            ? clipsRes.clips.map((c, i) => ({
                id: c.id ?? `clip-${i}`,
                url: c.url,
                startTime: c.startTime ?? (c as { start_time?: number }).start_time,
                endTime: c.endTime ?? (c as { end_time?: number }).end_time,
                description: c.description,
                viralDescription: c.viralDescription,
                score: c.score,
                thumbnailUrl: c.thumbnailUrl,
              }))
            : []

        setClips([])
        setClips(newClips)
      }

      if (data.job.status === 'failed') {
        setClips([])
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
      let s = await pollJob(String(jobId))
        while (!cancelled && s !== 'completed' && s !== 'failed' && s != null) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
        if (cancelled) return
        s = await pollJob(String(jobId))
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
    const jobIdStr = String(jobId)
    if (jobIdRef.current !== jobIdStr) return
    if (savedJobRef.current === jobIdStr) return
    savedJobRef.current = jobIdStr
    const videoId = getYouTubeVideoId(videoUrl)
    const thumbnail = videoId
      ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      : videoPreview.thumbnail_url || getYouTubeThumbnail(videoUrl) || '/placeholder-thumbnail.png'
    addToLibrary({
      id: jobIdStr,
      type: 'clips',
      videoUrl,
      videoTitle: videoPreview.title,
      thumbnail,
      createdAt: new Date().toISOString(),
      status: 'completed',
      aspectRatio,
      clipLength,
      clips: clips.map((c, i) => ({
        url: c.url,
        score: typeof c.score === 'number' ? c.score : undefined,
        description: c.description,
        viralDescription: c.viralDescription,
        duration: c.startTime != null && c.endTime != null ? c.endTime - c.startTime : undefined,
        startTime: c.startTime,
        endTime: c.endTime,
        id: c.id ?? `clip-${i}`,
        thumbnailUrl: c.thumbnailUrl,
      })),
    })
    setSavedToLibrary(true)
  }, [status, jobId, videoUrl, clips, videoPreview, aspectRatio, clipLength])

  // Load job from ?job= query (View Clips from Library)
  useEffect(() => {
    if (!router.isReady) return
    const jobParam = router.query.job
    const id = typeof jobParam === 'string' ? jobParam : jobParam?.[0]
    if (!id) return
    apiJson<ClipsResponse>(`/api/clips/${id}`)
      .then((data) => {
        if (data.success && data.clips?.length) {
          setJobId(id)
          setStatus('completed')
          setClips(
            data.clips.map((c, i) => ({
              id: c.id ?? `clip-${i}`,
              url: c.url,
              startTime: c.startTime ?? (c as { start_time?: number }).start_time,
              endTime: c.endTime ?? (c as { end_time?: number }).end_time,
              description: c.description,
              viralDescription: c.viralDescription,
              score: c.score,
              thumbnailUrl: c.thumbnailUrl,
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
              thumbnailUrl: c.thumbnailUrl,
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
  }, [router.isReady, router.query.job])

  // Scroll to clips when loading from ?job=
  useEffect(() => {
    if (!router.isReady) return
    if (router.query.job && step === 5 && clips.length > 0) {
      requestAnimationFrame(() => {
        document.getElementById('clips')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [router.isReady, router.query.job, step, clips.length])

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
    jobIdRef.current = null
  }

  const handleRemoveClip = useCallback(
    (clipIndex: number) => {
      if (jobId == null) return
      removeClipFromLibrary(String(jobId), clipIndex)
      setClips((prev) => {
        const next = prev.filter((_, i) => i !== clipIndex)
        if (next.length === 0) setSavedToLibrary(false)
        return next
      })
    },
    [jobId]
  )

  const showToolsGrid = step === 3 && videoPreview && toolMode === null
  const showClipSettings = step === 3 && videoPreview && toolMode === 'clips'
  const showTranscriptSettings = step === 3 && videoPreview && toolMode === 'transcript'
  const showTranscriptProgress = transcriptJobId && transcriptStatus && transcriptStatus !== 'completed' && transcriptStatus !== 'failed'
  const showSettings = showClipSettings
  const showProgress = step === 4 || (step === 5 && status === 'completed')
  const progressInfo = status ? PROGRESS_MAP[status] ?? PROGRESS_MAP.queued : PROGRESS_MAP.queued
  const progressPercent = status === 'failed' ? 100 : progressInfo.percent
  /** Finished clip grid: hide URL hero, “What you get”, and the 100% progress bar. */
  const clipsResultsView = step === 5 && clips.length > 0

  if (!router.isReady || isLoading || !isAuthenticated) {
    return (
      <>
        <Head>
          <title>Dashboard – Cutnary</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div className="min-h-screen bg-[#0a0a0b]" />
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Dashboard – Cutnary</title>
        <meta name="description" content="Cutnary Studio — AI clips and transcripts (2026)" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0a0b" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#070708]">
        {/* Ambient mesh — violet/indigo (studio 2026) */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute -left-40 -top-40 h-[40rem] w-[40rem] rounded-full bg-violet-600/[0.08] blur-[120px]" />
          <div className="absolute -right-32 top-1/4 h-[40rem] w-[40rem] rounded-full bg-fuchsia-500/[0.05] blur-[140px]" />
          <div className="absolute bottom-0 left-1/2 h-[30rem] w-[min(100%,60rem)] -translate-x-1/2 rounded-full bg-indigo-600/[0.04] blur-[100px]" />
        </div>

        <Header />

        <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="mb-8 border-b border-white/[0.06] pb-6 sm:mb-10 sm:pb-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              <span className="text-violet-400">Cutnary</span>
              <span className="mx-2 text-zinc-700">·</span>
              <span>Studio 2026</span>
            </p>
            {clipsResultsView ? (
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Your clips</h1>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
                    Add AI voice explainer to any clip with the Add AI Voice button on a card.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPostCampaignOpen(true)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 hover:scale-[1.02] active:scale-[0.98] sm:px-6"
                >
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Post clips
                </button>
              </div>
            ) : (
              <>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Dashboard</h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
                  Paste a YouTube link below, choose AI clipping or transcript, then export.
                </p>
              </>
            )}
          </div>

          {!clipsResultsView && (
          <section id={CLIP_DASHBOARD_SECTION_ID} className="mb-16 scroll-mt-24">
            <div className="flex flex-col items-center">
              <div className="w-full max-w-2xl rounded-[2.5rem] border border-white/[0.05] bg-zinc-900/40 p-10 shadow-2xl shadow-black/40 ring-1 ring-white/[0.04] backdrop-blur-md sm:p-12">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 ring-1 ring-white/[0.08]">
                  <svg className="h-8 w-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="mt-8 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">Start clipping</h2>
                <p className="mx-auto mt-4 max-w-md text-center text-base leading-relaxed text-zinc-400">
                  Paste a public YouTube URL. After it loads, choose AI clips or a full transcript.
                </p>

                <form onSubmit={handleUrlSubmit} className="mt-10">
                  <div
                    className={`group relative flex flex-col gap-3 rounded-2xl border bg-zinc-950/40 p-2 transition-all duration-500 sm:flex-row sm:items-center ${
                      urlInputFocused ? 'border-violet-500/50 ring-4 ring-violet-500/10' : 'border-white/[0.08]'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4 pl-4 pr-2">
                      <svg className={`h-6 w-6 shrink-0 transition-colors duration-300 ${urlInputFocused ? 'text-violet-400' : 'text-zinc-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <input
                        id="dashboard-video-url"
                        type="url"
                        value={videoUrl}
                        onChange={(e) => {
                          setVideoUrl(e.target.value)
                          setPreviewError(null)
                        }}
                        onFocus={() => setUrlInputFocused(true)}
                        onBlur={() => setUrlInputFocused(false)}
                        placeholder="https://www.youtube.com/watch?v=…"
                        disabled={previewLoading}
                        className="min-w-0 flex-1 bg-transparent py-4 text-base text-white placeholder-zinc-600 outline-none"
                        autoComplete="off"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={previewLoading || !videoUrl.trim()}
                      className="relative shrink-0 overflow-hidden rounded-xl bg-violet-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-violet-600/20 transition-all hover:bg-violet-500 hover:shadow-violet-600/40 disabled:opacity-50"
                    >
                      <span className="relative z-10">{previewLoading ? 'Loading…' : 'Continue'}</span>
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                    </button>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    <span className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Other sources</span>
                    <button
                      type="button"
                      disabled
                      title="Upload from your device — coming soon"
                      className="inline-flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] px-5 py-3 text-sm font-medium text-zinc-500 cursor-not-allowed transition-colors hover:bg-white/[0.04]"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload video
                    </button>
                    <span className="rounded-full bg-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-400 ring-1 ring-violet-500/20">
                      Coming soon
                    </span>
                  </div>

                  {previewError && (
                    <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {previewError}
                    </div>
                  )}
                </form>
              </div>

              <div className="mt-20 w-full max-w-4xl">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-zinc-800" />
                  <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">What you get</p>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-zinc-800" />
                </div>
                <ul className="mt-10 grid gap-6 sm:grid-cols-3">
                  {[
                    {
                      title: 'Viral moment picks',
                      body: 'AI finds strong hooks and cuts tuned for shorts.',
                      icon: (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      ),
                    },
                    {
                      title: 'Captions & styles',
                      body: 'Burn-in subtitles with presets you control.',
                      icon: (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      ),
                    },
                    {
                      title: 'Transcripts',
                      body: 'Full transcript with optional speaker labels.',
                      icon: (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      ),
                    },
                  ].map((item) => (
                    <li
                      key={item.title}
                      className="group relative flex flex-col items-center rounded-[2rem] border border-white/[0.05] bg-zinc-950/40 p-8 text-center ring-1 ring-white/[0.03] transition-all hover:bg-zinc-900/60"
                    >
                      <div className="absolute inset-x-0 -top-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20 transition-transform group-hover:scale-110">
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          {item.icon}
                        </svg>
                      </div>
                      <p className="mt-6 text-base font-bold text-zinc-100">{item.title}</p>
                      <p className="mt-3 text-sm leading-relaxed text-zinc-500">{item.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
          )}

          {/* Original functionality below */}
          {(showToolsGrid || showSettings || showTranscriptSettings || showTranscriptProgress || showProgress) && videoPreview && (
            <section
              ref={previewRef}
              className="mb-12 animate-[fadeIn_0.4s_ease-out_forwards] opacity-0 [animation-fill-mode:forwards]"
            >
              <div className="group relative overflow-hidden rounded-[2rem] border border-white/[0.05] bg-zinc-950/40 p-1 ring-1 ring-white/[0.04] backdrop-blur-md">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-fuchsia-600/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
                  <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-[1.5rem] bg-zinc-900 shadow-2xl ring-1 ring-white/[0.08] sm:max-w-[320px]">
                    <img
                      src={videoPreview.thumbnail_url}
                      alt={videoPreview.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md ring-1 ring-white/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                      Preview
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-bold tracking-tight text-white line-clamp-2">{videoPreview.title}</h3>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-zinc-800 ring-1 ring-white/[0.08]" />
                      <p className="text-base font-medium text-zinc-400">{videoPreview.author_name}</p>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-zinc-400 ring-1 ring-white/[0.08]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Source: YouTube
                      </div>
                      <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-widest ring-1 ${
                        showProgress || showTranscriptProgress ? 'bg-violet-500/10 text-violet-400 ring-violet-500/20' : 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${showProgress || showTranscriptProgress ? 'bg-violet-400 animate-pulse' : 'bg-emerald-400'}`} />
                        {showProgress ? 'Processing Clips' : showTranscriptProgress ? 'Transcribing' : 'Ready to Clip'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Tools grid – choose AI Clipping or Video Transcript */}
          {showToolsGrid && (
            <section className="mb-16">
              <div className="mb-10 flex items-center gap-4">
                <div className="h-8 w-1 bg-violet-600 rounded-full" />
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Choose a tool</h2>
                  <p className="mt-1 text-base text-zinc-500">Select the AI powerhouse for your content</p>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setToolMode('clips')}
                  className="group relative flex flex-col items-start overflow-hidden rounded-[2.5rem] border border-white/[0.05] bg-zinc-950/40 p-10 text-left ring-1 ring-white/[0.03] transition-all duration-500 hover:bg-zinc-900/60 hover:ring-white/[0.08]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-400 ring-1 ring-violet-500/30 transition-transform duration-500 group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="relative mt-8 text-2xl font-bold text-white transition-colors group-hover:text-violet-400">AI Clipping</h3>
                  <p className="relative mt-4 text-base leading-relaxed text-zinc-400">Extract viral clips with AI. Intelligent scene detection and automatic framing.</p>
                  <div className="relative mt-8 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-violet-400 opacity-0 transition-all duration-500 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0">
                    Select Tool
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setToolMode('transcript')}
                  className="group relative flex flex-col items-start overflow-hidden rounded-[2.5rem] border border-white/[0.05] bg-zinc-950/40 p-10 text-left ring-1 ring-white/[0.03] transition-all duration-500 hover:bg-zinc-900/60 hover:ring-white/[0.08]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-fuchsia-600/20 text-fuchsia-400 ring-1 ring-fuchsia-500/30 transition-transform duration-500 group-hover:scale-110 group-hover:bg-fuchsia-600 group-hover:text-white">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="relative mt-8 text-2xl font-bold text-white transition-colors group-hover:text-fuchsia-400">Video Transcript</h3>
                  <p className="relative mt-4 text-base leading-relaxed text-zinc-400">Transcribe with precision. AI-powered speaker labeling and timestamping.</p>
                  <div className="relative mt-8 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-fuchsia-400 opacity-0 transition-all duration-500 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0">
                    Select Tool
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </button>
              </div>
            </section>
          )}

          {/* Transcript settings – when Video Transcript selected */}
          {showTranscriptSettings && (
            <section className="mb-16 animate-[fadeIn_0.4s_ease-out_forwards]">
              <div className="overflow-hidden rounded-[2.5rem] border border-white/[0.05] bg-zinc-900/40 p-8 ring-1 ring-white/[0.04] backdrop-blur-md sm:p-12">
                <div className="mb-10 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Transcript Settings</h2>
                    <p className="mt-1 text-base text-zinc-500">Configure your transcription engine</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setToolMode(null); setTranscriptError(null); setTranscriptStatus(null); setTranscriptJobId(null) }}
                    className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-4 py-2 text-sm font-bold text-zinc-400 ring-1 ring-white/[0.08] transition-all hover:bg-white/[0.1] hover:text-white"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                  </button>
                </div>
                <div className="grid gap-10 lg:grid-cols-2">
                  <div className="space-y-8">
                    <div>
                      <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-zinc-500">Language</label>
                      <div className="relative">
                        <select
                          value={transcriptLanguage}
                          onChange={(e) => setTranscriptLanguage(e.target.value)}
                          className="w-full appearance-none rounded-2xl border border-white/[0.08] bg-zinc-950/40 px-5 py-4 text-base text-white focus:border-violet-500/50 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
                        >
                          {LANGUAGES.map((l) => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-zinc-500">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6 ring-1 ring-white/[0.04]">
                      <div>
                        <p className="text-lg font-bold text-white">Speaker separation</p>
                        <p className="mt-1 text-sm text-zinc-500">Automatically label different speakers</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={speakerSeparation}
                        onClick={() => setSpeakerSeparation((s) => !s)}
                        className={`relative h-8 w-14 rounded-full transition-all duration-300 ${speakerSeparation ? 'bg-violet-600 shadow-[0_0_15px_rgba(139,92,246,0.4)]' : 'bg-zinc-800'}`}
                      >
                        <span className={`absolute top-1.5 h-5 w-5 rounded-full bg-white shadow-lg transition-all duration-300 ${speakerSeparation ? 'left-7' : 'left-1.5'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col justify-end">
                    <button
                      onClick={handleGenerateTranscript}
                      disabled={transcriptSubmitting || showTranscriptProgress}
                      className="group relative overflow-hidden rounded-2xl bg-violet-600 py-5 text-lg font-bold text-white shadow-2xl shadow-violet-600/20 transition-all hover:bg-violet-500 hover:shadow-violet-600/40 disabled:opacity-50"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        {transcriptSubmitting ? (
                          <>
                            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Starting…
                          </>
                        ) : showTranscriptProgress ? (
                          `${transcriptStatus}…`
                        ) : (
                          <>
                            Generate Transcript
                            <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </>
                        )}
                      </span>
                    </button>
                    {transcriptError && (
                      <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-red-400">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {transcriptError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Settings – step 3, AI Clipping selected */}
          {showSettings && (
            <section className="mb-16 animate-[fadeIn_0.4s_ease-out_forwards]">
              <div className="overflow-hidden rounded-[2.5rem] border border-white/[0.05] bg-zinc-900/40 p-8 ring-1 ring-white/[0.04] backdrop-blur-md sm:p-12">
                <div className="mb-10 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">AI Clipping Settings</h2>
                    <p className="mt-1 text-base text-zinc-500">Customize how AI extracts your viral moments</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setToolMode(null)}
                    className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-4 py-2 text-sm font-bold text-zinc-400 ring-1 ring-white/[0.08] transition-all hover:bg-white/[0.1] hover:text-white"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                  </button>
                </div>

                <div className="space-y-12">
                  <div className="grid gap-8 lg:grid-cols-2">
                    <div className="group relative rounded-[2rem] border border-white/[0.05] bg-zinc-950/40 p-8 ring-1 ring-white/[0.03] transition-all hover:bg-zinc-900/40">
                      <div className="absolute inset-x-0 -top-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      <AspectRatioDropdown
                        value={aspectRatio}
                        onChange={setAspectRatio}
                      />
                    </div>
                    <div className="group relative rounded-[2rem] border border-white/[0.05] bg-zinc-950/40 p-8 ring-1 ring-white/[0.03] transition-all hover:bg-zinc-900/40">
                      <div className="absolute inset-x-0 -top-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-fuchsia-500/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      <ClipLengthDropdown
                        value={clipLength}
                        onChange={setClipLength}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-6 block text-center text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
                      Caption Style
                    </label>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
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

                  <div className="pt-4">
                    <button
                      onClick={handleGenerateClips}
                      disabled={isSubmitting}
                      className="group relative w-full overflow-hidden rounded-2xl bg-violet-600 py-6 text-xl font-bold text-white shadow-2xl shadow-violet-600/20 transition-all hover:bg-violet-500 hover:shadow-violet-600/40 disabled:opacity-50"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        {isSubmitting ? (
                          <>
                            <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Initializing AI Agent…
                          </>
                        ) : (
                          <>
                            Generate Magic Clips
                            <svg className="h-6 w-6 transition-transform group-hover:translate-x-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </>
                        )}
                      </span>
                    </button>
                    {error && (
                      <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Progress bar – step 4 (hidden once clip grid is shown) */}
          {showProgress && !clipsResultsView && (
            <section className="mb-16 animate-[fadeIn_0.4s_ease-out_forwards]">
              <div className="overflow-hidden rounded-[2.5rem] border border-white/[0.05] bg-zinc-900/40 p-10 ring-1 ring-white/[0.04] backdrop-blur-md sm:p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="relative mb-10 h-24 w-24">
                    <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 100 100">
                      <circle
                        className="text-white/[0.03]"
                        strokeWidth="6"
                        stroke="currentColor"
                        fill="transparent"
                        r="42"
                        cx="50"
                        cy="50"
                      />
                      <circle
                        className={`transition-all duration-1000 ease-out ${
                          status === 'failed' ? 'text-red-500' : status === 'completed' ? 'text-emerald-500' : 'text-violet-500'
                        }`}
                        strokeWidth="6"
                        strokeDasharray={2 * Math.PI * 42}
                        strokeDashoffset={2 * Math.PI * 42 * (1 - progressPercent / 100)}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="42"
                        cx="50"
                        cy="50"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xl font-bold tracking-tighter text-white">
                      {status === 'failed' ? '!' : `${progressPercent}%`}
                    </div>
                  </div>
                  
                  <h3 className={`text-2xl font-bold tracking-tight ${
                    status === 'failed' ? 'text-red-400' : status === 'completed' ? 'text-emerald-400' : 'text-white'
                  }`}>
                    {status === 'failed' ? 'Processing Failed' : status === 'completed' ? 'Processing Complete' : 'AI is working'}
                  </h3>
                  <p className="mt-2 text-base text-zinc-500">
                    {status === 'failed' ? (jobError ?? 'An error occurred during processing') : progressInfo.label}
                  </p>

                  <div className="mt-12 w-full max-w-md">
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.03]">
                      <div
                        className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out ${
                          status === 'failed' ? 'bg-red-500' : status === 'completed' ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-600 to-fuchsia-600'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      >
                        <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.2),transparent)] bg-[length:200%_100%] animate-[shimmer_2s_infinite]" />
                      </div>
                    </div>
                  </div>

                  {status === 'failed' && (
                    <button
                      onClick={handleReset}
                      className="mt-10 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-6 py-3 text-sm font-bold text-red-400 transition-all hover:bg-red-500/20"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Saved to Library banner */}
          {step === 5 && savedToLibrary && clips.length > 0 && (
            <div className="mb-6 flex items-center justify-between rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3">
              <span className="text-sm font-medium text-violet-300">✓ Saved to Library!</span>
              <Link
                href="/library"
                className="text-sm font-medium text-violet-300 hover:text-violet-200 hover:underline"
              >
                View in Library →
              </Link>
            </div>
          )}

          {/* Results – fades in when clips load */}
          {step === 5 && clips.length > 0 && (
            <section id="clips" className="mb-16 animate-[fadeIn_0.5s_ease-out_forwards] opacity-0 [animation-fill-mode:forwards]">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <p className="max-w-xl text-sm leading-relaxed text-zinc-500">
                  Use <span className="text-zinc-400">Share</span> on a card to publish one clip. For several clips, use{' '}
                  <span className="text-zinc-400">Post clips</span> above (from your library) or open{' '}
                  <Link href="/library" className="font-medium text-violet-400/90 underline-offset-2 hover:text-violet-300 hover:underline">
                    Library
                  </Link>
                  .
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="shrink-0 self-start rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white sm:self-auto"
                >
                  New video
                </button>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {clips.map((clip, clipIndex) => (
                  <ClipCard
                    key={clip.url}
                    clip={clip}
                    jobId={jobId != null ? String(jobId) : undefined}
                    clipIndex={clipIndex}
                    canRemove={
                      savedToLibrary ||
                      (jobId != null && getLibrary().some((e) => e.id === String(jobId) && e.type === 'clips'))
                    }
                    onRemoveClip={handleRemoveClip}
                  />
                ))}
              </div>
            </section>
          )}

          {step === 5 && clips.length === 0 && status === 'completed' && (
            <section className="animate-[fadeIn_0.4s_ease-out_forwards] overflow-hidden rounded-[2.5rem] border border-white/[0.05] bg-zinc-900/40 p-16 text-center ring-1 ring-white/[0.04] backdrop-blur-md">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800/50 text-zinc-600 ring-1 ring-white/[0.08]">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mt-8 text-2xl font-bold text-white">No clips found</h3>
              <p className="mx-auto mt-2 max-w-sm text-base text-zinc-500">AI couldn't detect any viral moments in this video. Try a different video or length setting.</p>
              <button
                onClick={handleReset}
                className="mt-10 rounded-xl bg-white/[0.05] px-8 py-3 text-sm font-bold text-white ring-1 ring-white/[0.08] transition-all hover:bg-white/[0.1]"
              >
                Try Another Video
              </button>
            </section>
          )}
        </main>
      </div>

      {postCampaignOpen && <PostCampaignModal onClose={() => setPostCampaignOpen(false)} />}
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
    <div className="relative w-full">
      <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-zinc-500">Aspect Ratio</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex w-full items-center gap-4 rounded-2xl border border-white/[0.08] bg-zinc-950/40 
          px-5 py-4 text-left text-white transition-all hover:border-white/[0.2] hover:bg-zinc-900/60 
          focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20">
          <AspectRatioIcon ratio={value} />
        </div>
        <div className="flex-1">
          <p className="text-base font-bold">{selected.label}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Video Format</p>
        </div>
        <svg className={`h-5 w-5 text-zinc-600 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-3 w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900 p-2 shadow-2xl ring-1 ring-white/[0.05] backdrop-blur-xl">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onChange(r.value)}
              className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors ${
                value === r.value ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${value === r.value ? 'bg-white/20' : 'bg-white/[0.03]'}`}>
                <AspectRatioIcon ratio={r.value} />
              </div>
              <span className="text-sm font-bold">{r.label}</span>
              {value === r.value && (
                <svg className="ml-auto h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
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
    <div className="relative w-full">
      <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-zinc-500">Max Duration</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex w-full items-center gap-4 rounded-2xl border border-white/[0.08] bg-zinc-950/40 
          px-5 py-4 text-left text-white transition-all hover:border-white/[0.2] hover:bg-zinc-900/60 
          focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-400 ring-1 ring-fuchsia-500/20">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-base font-bold">{selected.label}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Length Limit</p>
        </div>
        <svg className={`h-5 w-5 text-zinc-600 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-3 w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900 p-2 shadow-2xl ring-1 ring-white/[0.05] backdrop-blur-xl">
          {CLIP_LENGTHS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => onChange(l.value)}
              className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors ${
                value === l.value ? 'bg-fuchsia-600 text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${value === l.value ? 'bg-white/20' : 'bg-white/[0.03]'}`}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-bold">{l.label}</span>
              {value === l.value && (
                <svg className="ml-auto h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
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
      className={`group relative flex flex-col items-center gap-4 rounded-3xl border p-5 text-center transition-all duration-300 ${
        selected
          ? 'border-violet-500/50 bg-violet-600/10 ring-4 ring-violet-500/10'
          : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:ring-1 hover:ring-white/[0.1]'
      }`}
    >
      <div className={`flex h-14 w-full items-center justify-center rounded-[1.25rem] transition-all duration-300 ${
        selected ? 'bg-black/60 shadow-inner shadow-black/40' : 'bg-black/40'
      }`}>
        {value === 'none' && <span className="text-sm font-bold tracking-widest text-zinc-600 uppercase">None</span>}
        {value === 'simple' && <span className="text-sm font-bold text-white tracking-tight">{SAMPLE}</span>}
        {value === 'bold' && (
          <span className="text-sm font-black text-white tracking-tight">{SAMPLE}</span>
        )}
        {value === 'karaoke' && (
          <span className="text-sm font-bold text-white tracking-tight">
            <span className="rounded-md bg-violet-500 px-1.5 py-0.5 shadow-[0_0_10px_rgba(139,92,246,0.5)]">{SAMPLE.split(' ')[0]}</span>{' '}
            {SAMPLE.split(' ').slice(1).join(' ')}
          </span>
        )}
        {value === 'glitch' && (
          <span className="text-sm font-black text-violet-300 tracking-tight" style={{ textShadow: '2px 0 #7c3aed, -2px 0 #a78bfa' }}>
            {SAMPLE}
          </span>
        )}
      </div>
      <div className="flex flex-col items-center">
        <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${selected ? 'text-white' : 'text-zinc-500'}`}>{label}</span>
      </div>
      {selected && (
        <div className="absolute right-3 top-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white shadow-xl shadow-violet-600/40">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </button>
  )
}
