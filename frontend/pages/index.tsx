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
import { apiFetch, apiJson, parseResponseJson } from '@/lib/api'
import { addToLibrary, getLibrary, getYouTubeThumbnail, getYouTubeVideoId, removeClipFromLibrary, updateLibraryEntry } from '@/lib/library'
import { useAuth } from '@/context/AuthContext'
import { CLIP_DASHBOARD_SECTION_ID } from '@/lib/clip_dashboard'
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

export default function Home() {
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
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const FAQS = [
    {
      question: 'How does Cutnary work?',
      answer: 'Cutnary uses AI to analyze your long-form videos, identifying the most engaging moments to create short-form clips optimized for social media.'
    },
    {
      question: 'What types of videos can I upload?',
      answer: 'Currently we support YouTube links for talking videos, podcasts, and educational content. We are working on direct file uploads.'
    },
    {
      question: 'Which languages are supported?',
      answer: 'We support over 20+ languages including English, Spanish, French, German, and more.'
    },
    {
      question: 'Can I add captions?',
      answer: 'Yes! Cutnary automatically generates and adds stylish, high-accuracy captions to all your clips.'
    },
    {
      question: 'Is Cutnary free to use?',
      answer: 'We offer a free tier to get you started with several minutes of processing time each month.'
    },
    {
      question: 'I have more questions!',
      answer: 'Feel free to reach out to our support team or check our learning center for more detailed guides.'
    }
  ]

  const previewRef = useRef<HTMLElement | null>(null)
  const jobIdRef = useRef<string | null>(null)

  useEffect(() => {
    jobIdRef.current = jobId
  }, [jobId])

  useEffect(() => {
    if (!router.isReady || isLoading) return
    if (isAuthenticated) void router.replace('/dashboard')
  }, [router.isReady, isLoading, isAuthenticated, router])

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
  }, [router.query.job])

  // Scroll to clips when loading from ?job=
  useEffect(() => {
    if (router.query.job && step === 5 && clips.length > 0) {
      requestAnimationFrame(() => {
        document.getElementById('clips')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [router.query.job, step, clips.length])

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

  if (!router.isReady || isLoading) {
    return (
      <>
        <Head>
          <title>Cutnary – AI Video Clipper</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div className="min-h-screen bg-[#0a0a0b]" />
      </>
    )
  }

  if (isAuthenticated) {
    return (
      <>
        <Head>
          <title>Cutnary – AI Video Clipper</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div className="min-h-screen bg-[#0a0a0b]" />
      </>
    )
  }

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
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-blue-600/15 blur-[120px]" />
          <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-[140px]" />
          <div className="absolute bottom-0 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-blue-600/5 blur-[100px]" />
        </div>

        <Header />

        <main className="relative mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:py-24">
          {/* Hero — primary clip / URL upload dashboard */}
          <section id={CLIP_DASHBOARD_SECTION_ID} className="mb-24 scroll-mt-24 lg:mb-32">
            <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
              <div className="mb-12 lg:mb-0">
                <div className="mb-6 inline-flex items-center rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-[#22c55e]">
                  #1 AI VIDEO CLIPPING TOOL
                </div>
                <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
                  1 long video,
                  <br />
                  10 viral clips.
                  <br />
                  Create 10x faster.
                </h1>
                <p className="mt-8 max-w-xl text-lg text-zinc-400">
                  Cutnary is a generative AI video tool that repurposes long talking videos into shorts <span className="text-white font-medium">in one click</span>. Powered by OpenAI.
                </p>
                
                <form onSubmit={handleUrlSubmit} className="mt-10">
                  <div className="flex flex-wrap items-center gap-3">
                    <div
                      className={`relative flex min-w-[300px] flex-1 items-center rounded-xl border bg-zinc-900/60 py-3 pl-4 pr-3 
                        transition-all duration-300 ${
                        urlInputFocused
                          ? 'border-[#6112ff]/60 shadow-[0_0_0_1px_rgba(97,18,255,0.3)]'
                          : 'border-zinc-800'
                      }`}
                    >
                      <svg className="mr-3 h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => {
                          setVideoUrl(e.target.value)
                          setPreviewError(null)
                        }}
                        onFocus={() => setUrlInputFocused(true)}
                        onBlur={() => setUrlInputFocused(false)}
                        placeholder="Drop a video link"
                        disabled={previewLoading}
                        className="min-w-0 flex-1 bg-transparent text-white placeholder-zinc-600 outline-none"
                      />
                      <button
                        type="submit"
                        disabled={previewLoading || !videoUrl.trim()}
                        className="ml-2 rounded-lg bg-[#6112ff] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#7226ff] disabled:opacity-50"
                      >
                        {previewLoading ? '...' : 'Get free clips'}
                      </button>
                    </div>
                    <span className="text-zinc-500">or</span>
                    <button
                      type="button"
                      className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800"
                    >
                      Upload file
                    </button>
                  </div>
                  {previewError && (
                    <p className="mt-3 text-sm text-red-400">{previewError}</p>
                  )}
                </form>
              </div>

              {/* Visual side */}
              <div className="relative hidden lg:block">
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="grid grid-cols-4 gap-4 opacity-50">
                     {[...Array(12)].map((_, i) => (
                       <div key={i} className={`h-16 w-16 rounded-2xl ${['bg-pink-500', 'bg-violet-600', 'bg-blue-500', 'bg-white'][i % 4]}`} />
                     ))}
                   </div>
                </div>
                <div className="relative z-10 rounded-[32px] border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
                  <div className="mb-6 text-center text-2xl font-bold text-white">Brand Templates</div>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-zinc-900">
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" />
                        <div className="absolute inset-x-2 top-2 rounded-md bg-cyan-400/90 py-1 text-center text-[8px] font-bold uppercase text-black">
                          AI TOOLS FOR CREATORS
                        </div>
                        <div className="absolute inset-x-2 bottom-4 text-center text-[10px] font-bold text-white uppercase">
                          IT HELPS ME
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Original functionality below */}
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

          {/* New Sections */}
          {!videoPreview && (
            <>
              {/* Trust Section */}
              <section className="mb-24 lg:mb-32">
                <div className="text-center">
                  <p className="mb-12 text-zinc-500 font-medium">Used by 16M+ creators and businesses</p>
                  
                  {/* Creators Row */}
                  <div className="flex flex-wrap justify-center gap-x-12 gap-y-10 mb-20 px-4">
                    {[
                      { name: 'TwoSetViolin', count: '4.3M', platform: 'youtube', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TwoSet' },
                      { name: 'Jon Youshaei', count: '435K', platform: 'youtube', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jon' },
                      { name: 'Armchair Historian', count: '2.2M', platform: 'youtube', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Armchair' },
                      { name: 'SaaStr', count: '54.4K', platform: 'linkedin', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SaaStr' },
                      { name: 'Sebastien Jefferies', count: '422K', platform: 'tiktok', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Seb' },
                      { name: 'FLAGRANT', count: '1.5M', platform: 'youtube', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Flagrant' },
                      { name: 'Mai Pham', count: '3.3M', platform: 'youtube', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mai' },
                      { name: 'Valuetainment', count: '5.3M', platform: 'youtube', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Value' },
                    ].map((creator) => (
                      <div key={creator.name} className="flex flex-col items-center group">
                        <div className="relative mb-3 h-16 w-16">
                          <div className="h-full w-full overflow-hidden rounded-full border-2 border-zinc-800 transition-colors group-hover:border-zinc-700">
                            <img src={creator.img} alt={creator.name} className="h-full w-full object-cover" />
                          </div>
                          <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0a0a0b] bg-zinc-900 p-1">
                            {creator.platform === 'youtube' && (
                              <svg className="h-full w-full text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                              </svg>
                            )}
                            {creator.platform === 'linkedin' && (
                              <svg className="h-full w-full text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                              </svg>
                            )}
                            {creator.platform === 'tiktok' && (
                              <svg className="h-full w-full text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.33-.85.51-1.44 1.43-1.58 2.42-.14 1.01.23 2.08.94 2.82.71.74 1.76 1.13 2.8 1.01 1.05-.06 2.01-.66 2.58-1.53.33-.51.48-1.11.49-1.72.01-4.02-.01-8.03.02-12.05z" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-white mb-0.5">{creator.name}</span>
                        <span className="text-xs text-zinc-500">{creator.count}</span>
                      </div>
                    ))}
                  </div>

                  {/* Company Logos Row - Marquee */}
                  <div className="relative overflow-hidden py-10">
                    <div className="flex w-[200%] animate-marquee items-center justify-around gap-x-12 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex min-w-full shrink-0 items-center justify-around gap-x-12">
                          <span className="text-xl font-black tracking-tighter text-white">CHILI PIPER</span>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 bg-white rounded-md flex items-center justify-center">
                              <span className="text-black font-bold text-xs">M</span>
                            </div>
                            <span className="text-white font-bold tracking-tight">MEMPHIS <span className="text-zinc-500">GRIZZLIES</span></span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="h-6 w-6 bg-blue-500 rounded flex items-center justify-center text-white text-[10px] font-bold">Z</div>
                            <span className="text-white font-bold">zoominfo</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex gap-0.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                              </div>
                              <div className="h-1.5 w-1.5 rounded-full bg-white" />
                            </div>
                            <span className="text-xl font-bold text-white">Telefónica</span>
                          </div>
                          <span className="text-2xl font-black italic text-white">NVIDIA</span>
                          <div className="flex items-center gap-2">
                            <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            <span className="font-bold text-white">GitHub</span>
                          </div>
                          <span className="text-xl font-black text-white">iHeartMEDIA</span>
                          <span className="text-2xl font-black italic text-[#1a1f71] bg-white px-2 rounded">VISA</span>
                          <span className="text-xl font-bold text-white tracking-widest">AUDACY</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Features Grid Section */}
              <section className="mb-24 lg:mb-32">
                <div className="text-center mb-16">
                  <h2 className="text-4xl font-extrabold text-white mb-4 sm:text-5xl">Everything you need to grow</h2>
                  <p className="text-lg text-zinc-400">Advanced AI tools to help you create viral content in seconds.</p>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      title: 'AI Curation',
                      desc: 'Our AI analyzes your video to find the most engaging hooks and moments.',
                      icon: (
                        <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      )
                    },
                    {
                      title: 'AI Virality Score™',
                      desc: 'Get an instant score on how likely your clip is to go viral on social media.',
                      icon: (
                        <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      )
                    },
                    {
                      title: 'AI B-Roll',
                      desc: 'Automatically adds relevant B-roll to enhance storytelling and retention.',
                      icon: (
                        <svg className="h-6 w-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )
                    },
                    {
                      title: 'AI Captions',
                      desc: 'High-accuracy captions with dynamic animations and keyword highlighting.',
                      icon: (
                        <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                      )
                    }
                  ].map((feature, i) => (
                    <div key={i} className="group relative rounded-3xl border border-zinc-800 bg-zinc-900/40 p-8 transition-all hover:border-zinc-700 hover:bg-zinc-900/60">
                      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                        {feature.icon}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                      <p className="text-zinc-400 leading-relaxed">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Supported Platforms Section */}
              <section className="mb-24 lg:mb-32">
                <div className="rounded-[32px] bg-gradient-to-b from-zinc-900/50 to-transparent border border-zinc-800/50 p-12 lg:p-20">
                  <div className="lg:flex lg:items-center lg:gap-16">
                    <div className="lg:w-1/2 mb-12 lg:mb-0">
                      <h2 className="text-4xl font-extrabold text-white mb-6">Post everywhere. <br /><span className="text-[#6112ff]">Automatically.</span></h2>
                      <p className="text-lg text-zinc-400 mb-8 leading-relaxed">
                        Cutnary integrates with all major social platforms. Schedule and post your clips to Instagram, TikTok, YouTube, and Facebook without leaving the app.
                      </p>
                      <div className="flex flex-wrap gap-4">
                        {['Instagram', 'TikTok', 'YouTube', 'Facebook', 'LinkedIn'].map((p) => (
                          <div key={p} className="px-4 py-2 rounded-full bg-zinc-800 text-zinc-300 text-sm font-medium border border-zinc-700">
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="lg:w-1/2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <div className="aspect-square rounded-2xl bg-zinc-800 flex items-center justify-center p-8">
                            <svg className="w-full h-full text-zinc-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.063 1.366-.333 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.063-2.633-.333-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                          </div>
                          <div className="aspect-video rounded-2xl bg-zinc-800 flex items-center justify-center p-8">
                             <svg className="w-full h-full text-zinc-600" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                          </div>
                        </div>
                        <div className="space-y-4 pt-8">
                           <div className="aspect-[9/16] rounded-2xl bg-[#6112ff] flex items-center justify-center p-8 relative overflow-hidden">
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)]" />
                              <svg className="w-12 h-12 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.33-.85.51-1.44 1.43-1.58 2.42-.14 1.01.23 2.08.94 2.82.71.74 1.76 1.13 2.8 1.01 1.05-.06 2.01-.66 2.58-1.53.33-.51.48-1.11.49-1.72.01-4.02-.01-8.03.02-12.05z"/></svg>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* FAQ Section */}
              <section className="mb-24 lg:mb-32">
                <h2 className="mb-12 text-center text-4xl font-extrabold text-white">Got questions?</h2>
                <div className="mx-auto max-w-3xl space-y-4">
                  {FAQS.map((faq, idx) => (
                    <div
                      key={idx}
                      className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 transition-all"
                    >
                      <button
                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                        className="flex w-full items-center justify-between p-5 text-left"
                      >
                        <span className="font-bold text-white">{faq.question}</span>
                        <svg
                          className={`h-5 w-5 text-zinc-500 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openFaq === idx && (
                        <div className="border-t border-zinc-800 p-5 text-zinc-400">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Bottom CTA Section */}
              <section className="mb-24">
                <div className="relative overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950 p-12 lg:p-24 text-center">
                  {/* Internal glow */}
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(97,18,255,0.1)_0%,transparent_70%)]" />
                  
                  <h2 className="relative z-10 mb-10 text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl">
                    Get started with Cutnary
                  </h2>
                  
                  <div className="relative z-10 mx-auto max-w-2xl">
                    <form onSubmit={handleUrlSubmit}>
                      <div className="flex flex-wrap items-center gap-3">
                        <div
                          className={`relative flex min-w-[300px] flex-1 items-center rounded-xl border bg-zinc-900/60 py-3 pl-4 pr-3 
                            transition-all duration-300 ${
                            urlInputFocused
                              ? 'border-[#6112ff]/60 shadow-[0_0_0_1px_rgba(97,18,255,0.3)]'
                              : 'border-zinc-800'
                          }`}
                        >
                          <svg className="mr-3 h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <input
                            type="url"
                            value={videoUrl}
                            onChange={(e) => {
                              setVideoUrl(e.target.value)
                              setPreviewError(null)
                            }}
                            onFocus={() => setUrlInputFocused(true)}
                            onBlur={() => setUrlInputFocused(false)}
                            placeholder="Drop a video link"
                            disabled={previewLoading}
                            className="min-w-0 flex-1 bg-transparent text-white placeholder-zinc-600 outline-none"
                          />
                          <button
                            type="submit"
                            disabled={previewLoading || !videoUrl.trim()}
                            className="ml-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-black transition-all hover:bg-zinc-200 disabled:opacity-50"
                          >
                            {previewLoading ? '...' : 'Get free clips'}
                          </button>
                        </div>
                      </div>
                      {previewError && (
                        <p className="mt-3 text-sm text-red-400">{previewError}</p>
                      )}
                    </form>
                  </div>
                </div>
              </section>
            </>
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
                    transition-all hover:border-blue-500/50 hover:bg-zinc-900/80"
                  >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20">
                    <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    transition-all hover:border-blue-500/50 hover:bg-zinc-900/80"
                  >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20">
                    <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
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
                      className={`relative h-7 w-12 rounded-full transition-colors ${speakerSeparation ? 'bg-blue-600' : 'bg-zinc-700'}`}
                    >
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${speakerSeparation ? 'left-7 translate-x-[-100%]' : 'left-1'}`} />
                    </button>
                  </div>
                  <button
                    onClick={handleGenerateTranscript}
                    disabled={transcriptSubmitting || showTranscriptProgress}
                    className="mt-4 w-full rounded-xl bg-blue-600 py-4 font-semibold text-white
                      shadow-lg transition-all hover:bg-blue-500 disabled:opacity-50"
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
                    className="mt-4 w-full rounded-xl bg-blue-600 py-4
                      font-semibold text-white shadow-lg shadow-blue-500/20 transition-all
                      hover:bg-blue-500 hover:shadow-blue-500/30
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
                      status === 'failed' ? 'text-red-400' : status === 'completed' ? 'text-blue-400' : 'text-zinc-400'
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
                        ? 'font-medium text-blue-400'
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
            <div className="mb-6 flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3">
              <span className="text-sm font-medium text-blue-400">✓ Saved to Library!</span>
              <Link
                href="/library"
                className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline"
              >
                View in Library →
              </Link>
            </div>
          )}

          {/* Results – fades in when clips load */}
          {step === 5 && clips.length > 0 && (
            <section id="clips" className="mb-16 animate-[fadeIn_0.5s_ease-out_forwards] opacity-0 [animation-fill-mode:forwards]">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">Your clips</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Add AI voice explainer to any clip with the 🎙️ Add AI Voice button
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white"
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
          px-4 py-3 text-left text-white transition-colors hover:border-zinc-600           focus:border-blue-500
          focus:outline-none focus:ring-1 focus:ring-blue-500/50"
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
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-zinc-300 hover:bg-zinc-800'}`}
            >
              {value === r.value ? (
                <svg className="h-4 w-4 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
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
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-zinc-300 hover:bg-zinc-800'}`}
            >
              {value === l.value ? (
                <svg className="h-4 w-4 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          ? 'border-blue-500 bg-blue-500/10'
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
            <span className="rounded bg-blue-500/60 px-1">{SAMPLE.split(' ')[0]}</span>{' '}
            {SAMPLE.split(' ').slice(1).join(' ')}
          </span>
        )}
        {value === 'glitch' && (
          <span className="text-xs font-bold text-blue-400" style={{ textShadow: '2px 0 #3b82f6, -2px 0 #38bdf8' }}>
            {SAMPLE}
          </span>
        )}
      </div>
      <span className="text-xs text-zinc-500">{label}</span>
    </button>
  )
}
