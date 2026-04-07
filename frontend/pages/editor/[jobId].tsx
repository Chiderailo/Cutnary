/**
 * Editor Page - Video editor for Cutnary clips
 *
 * Layout: Top bar | Main (Video + Style + Subtitles) | Trim bar | Social Caption
 * - Responsive: mobile stacks vertically with collapsible panels
 * - Persists state to localStorage
 * - Social Caption section with platform limits and copy
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/context/AuthContext'
import { apiFetch, apiJson } from '@/lib/api'
import Head from 'next/head'
import Link from 'next/link'
import VideoPlayer, {
  type Subtitle,
  type CaptionStyle,
  type CaptionPosition,
  type FontSize,
} from '@/components/editor/VideoPlayer'
import SubtitleEditor from '@/components/editor/SubtitleEditor'
import StylePanel from '@/components/editor/StylePanel'
import TrimBar from '@/components/editor/TrimBar'


const PLATFORM_LIMITS: Record<string, number> = {
  instagram: 2200,
  tiktok: 2200,
  twitter: 280,
  youtube: 5000,
}

interface ClipWord {
  word: string
  start: number
  end: number
}

interface ClipData {
  id: string
  url: string
  startTime?: number
  endTime?: number
  description?: string
  viralDescription?: string
  words?: ClipWord[]
}

interface JobResponse {
  success: boolean
  job?: { id: string; status: string; clips?: ClipData[] }
}

interface EditorState {
  subtitles: Subtitle[]
  style: CaptionStyle
  position: CaptionPosition
  fontSize: FontSize
  textColor: string
  backgroundColor: string
  backgroundOpacity: number
  trimStart: number
  trimEnd: number
  socialCaption: string
}

/** Group words into subtitle lines: max 5 words or 3 seconds per line */
function buildSubtitlesFromWords(words: ClipWord[]): Subtitle[] {
  if (!words.length) return []

  const MAX_WORDS = 5
  const MAX_DURATION = 3
  const lines: Subtitle[] = []
  let buffer: ClipWord[] = []

  for (const w of words) {
    buffer.push(w)
    const lineStart = buffer[0].start
    const lineEnd = w.end
    const duration = lineEnd - lineStart

    if (buffer.length >= MAX_WORDS || duration >= MAX_DURATION) {
      lines.push({
        id: `sub-${lines.length}`,
        start: lineStart,
        end: lineEnd,
        text: buffer.map((x) => x.word).join(' '),
        words: [...buffer],
      })
      buffer = []
    }
  }
  if (buffer.length) {
    lines.push({
      id: `sub-${lines.length}`,
      start: buffer[0].start,
      end: buffer[buffer.length - 1].end,
      text: buffer.map((x) => x.word).join(' '),
      words: [...buffer],
    })
  }
  return lines
}

function initialSubtitles(clip: ClipData): Subtitle[] {
  const duration = (clip.endTime ?? 60) - (clip.startTime ?? 0)

  if (clip.words?.length) {
    const subs = buildSubtitlesFromWords(clip.words)
    if (subs.length) return subs
  }

  const text = clip.viralDescription ?? clip.description ?? ''
  if (!text.trim()) {
    return [{
      id: 'sub-0',
      start: 0,
      end: Math.min(3, duration),
      text: 'Add your subtitle',
      words: [{ word: 'Add your subtitle', start: 0, end: Math.min(3, duration) }],
    }]
  }
  const sentences = text.replace(/[.!?]+/g, (m) => m + '|||').split('|||').map((s) => s.trim()).filter(Boolean)
  if (sentences.length === 0) {
    return [{
      id: 'sub-0',
      start: 0,
      end: Math.min(3, duration),
      text,
      words: [{ word: text, start: 0, end: Math.min(3, duration) }],
    }]
  }
  const step = duration / sentences.length
  return sentences.map((s, i) => {
    const start = i * step
    const end = Math.min((i + 1) * step, duration)
    const words = s.split(/\s+/).filter(Boolean)
    const wordStep = (end - start) / Math.max(1, words.length)
    const wordObjs = words.map((w, wi) => ({
      word: w,
      start: start + wi * wordStep,
      end: start + (wi + 1) * wordStep,
    }))
    return { id: `sub-${i}`, start, end, text: s, words: wordObjs }
  })
}

function clipFilenameFromUrl(url: string): string {
  try {
    return new URL(url, 'http://localhost').pathname.split('/').pop() || ''
  } catch {
    return url.split('/').pop() || ''
  }
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function EditorPage() {
  const router = useRouter()
  const { jobId: jobIdRaw, clip: clipParam } = router.query
  const jobId = Array.isArray(jobIdRaw) ? jobIdRaw[0] : jobIdRaw || ''

  const [job, setJob] = useState<JobResponse['job'] | null>(null)
  const [clips, setClips] = useState<ClipData[]>([])
  const [selectedClip, setSelectedClip] = useState<ClipData | null>(null)
  const [subtitles, setSubtitles] = useState<Subtitle[]>([])
  const [currentSubtitleId, setCurrentSubtitleId] = useState<string | null>(null)
  const [seekTarget, setSeekTarget] = useState<number | null>(null)
  const [socialCaption, setSocialCaption] = useState('')
  const [platform, setPlatform] = useState('instagram')

  const [style, setStyle] = useState<CaptionStyle>('karaoke')
  const [position, setPosition] = useState<CaptionPosition>('bottom')
  const [fontSize, setFontSize] = useState<FontSize>('medium')
  const [textColor, setTextColor] = useState('#ffffff')
  const [backgroundColor, setBackgroundColor] = useState('#facc15')
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.8)

  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(60)

  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [renderStatus, setRenderStatus] = useState<'idle' | 'rendering' | 'completed' | 'failed'>('idle')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [showBackConfirm, setShowBackConfirm] = useState(false)
  const [collapsedMobile, setCollapsedMobile] = useState({ style: false, subtitles: false })
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clipUrl = selectedClip ? clipFilenameFromUrl(selectedClip.url) : ''
  const storageKey = jobId && clipUrl ? `editor_${String(jobId)}_${clipUrl}` : ''

  const hasUnsavedChanges = true
  const charLimit = PLATFORM_LIMITS[platform] ?? 2200
  const saveToStorage = useCallback(() => {
    if (!storageKey) return
    const state: EditorState = {
      subtitles,
      style,
      position,
      fontSize,
      textColor,
      backgroundColor,
      backgroundOpacity,
      trimStart,
      trimEnd,
      socialCaption,
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch {}
  }, [storageKey, subtitles, style, position, fontSize, textColor, backgroundColor, backgroundOpacity, trimStart, trimEnd, socialCaption])

  useEffect(() => {
    saveToStorage()
  }, [saveToStorage])

  const resetToOriginal = useCallback(() => {
    if (!storageKey) return
    try {
      localStorage.removeItem(storageKey)
    } catch {}
    if (selectedClip) {
      setSubtitles(initialSubtitles(selectedClip))
      setSocialCaption(selectedClip.viralDescription ?? selectedClip.description ?? '')
      const dur = (selectedClip.endTime ?? 60) - (selectedClip.startTime ?? 0)
      setTrimStart(0)
      setTrimEnd(dur)
    }
  }, [storageKey, selectedClip])

  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/auth/login')
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (!jobId) return
    const jobIdStr = String(jobId)
    apiJson<JobResponse>(`/api/job/${jobIdStr}`)
      .then((data) => {
        if (data.success && data.job?.clips) {
          setJob(data.job)
          setClips(data.job.clips)
        }
      })
      .catch(() => {})
  }, [jobId])

  useEffect(() => {
    if (clips.length === 0) return
    const targetFilename = typeof clipParam === 'string' ? clipParam : clipParam?.[0]
    const match = targetFilename ? clips.find((c) => clipFilenameFromUrl(c.url) === targetFilename) : null
    const clip = match ?? clips[0]
    setSelectedClip(clip)

    const url = clipFilenameFromUrl(clip.url)
    const key = jobId && url ? `editor_${String(jobId)}_${url}` : ''
    let stored: EditorState | null = null
    if (key) {
      try {
        const raw = localStorage.getItem(key)
        if (raw) stored = JSON.parse(raw) as EditorState
      } catch {}
    }
    if (stored) {
      setSubtitles(stored.subtitles)
      setStyle(stored.style)
      setPosition(stored.position)
      setFontSize(stored.fontSize)
      setTextColor(stored.textColor)
      setBackgroundColor(stored.backgroundColor)
      setBackgroundOpacity(stored.backgroundOpacity)
      setTrimStart(stored.trimStart)
      setTrimEnd(stored.trimEnd)
      setSocialCaption(stored.socialCaption)
    } else {
      setSubtitles(initialSubtitles(clip))
      setSocialCaption(clip.viralDescription ?? clip.description ?? '')
      const dur = (clip.endTime ?? 60) - (clip.startTime ?? 0)
      setTrimEnd(dur)
      setTrimStart(0)
    }
  }, [clips, clipParam, jobId])

  const handleSeekTo = useCallback((time: number) => {
    setSeekTarget(time)
    setTimeout(() => setSeekTarget(null), 0)
  }, [])

  const handleDurationChange = useCallback((d: number) => {
    setDuration(d)
    setTrimEnd((t) => (t > d || t === 0 ? d : t))
  }, [])

  const handleTrimChange = useCallback((start: number, end: number) => {
    setTrimStart(start)
    setTrimEnd(end)
  }, [])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const handleExport = async () => {
    if (!jobId || !selectedClip) return
    const jobIdStr = String(jobId)
    setExportError(null)
    setExporting(true)
    setRenderStatus('rendering')
    setDownloadUrl(null)
    const clipFilename = clipFilenameFromUrl(selectedClip.url)
    try {
      const res = await apiFetch(`/api/job/${jobIdStr}/render`, {
        method: 'POST',
        body: JSON.stringify({
          clipUrl: clipFilename,
          captions: subtitles.map((c) => ({ start: c.start, end: c.end, text: c.text, words: c.words })),
          style, position, fontSize, trimStart, trimEnd, textColor, backgroundColor, backgroundOpacity,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setExportError(data?.error ?? 'Export failed')
        setRenderStatus('failed')
        setExporting(false)
        return
      }
      if (data.status !== 'rendering') {
        setExportError('Unexpected response')
        setRenderStatus('failed')
        setExporting(false)
        return
      }
      const poll = async () => {
        const statusRes = await apiFetch(`/api/job/${jobIdStr}/render-status`)
        const statusData = await statusRes.json()
        if (statusData.status === 'completed' && statusData.downloadUrl) {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
          setRenderStatus('completed')
          setDownloadUrl(statusData.downloadUrl)
          setExporting(false)
          const a = document.createElement('a')
          a.href = statusData.downloadUrl
          a.download = `cutnary-${clipFilename.replace('.mp4', '_rendered.mp4')}`
          a.target = '_blank'
          a.click()
        } else if (statusData.status === 'failed') {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
          setRenderStatus('failed')
          setExportError(statusData.error ?? 'Rendering failed')
          setExporting(false)
        }
      }
      pollRef.current = setInterval(poll, 2000)
      poll()
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
      setRenderStatus('failed')
      setExporting(false)
    }
  }

  const handleCopyCaption = () => {
    const toCopy = socialCaption.length > charLimit ? socialCaption.slice(0, charLimit) : socialCaption
    navigator.clipboard.writeText(toCopy)
  }

  const clipName = selectedClip ? clipFilenameFromUrl(selectedClip.url).replace(/\.mp4$/i, '') || 'Clip' : 'Clip'
  const clipDurationSec = selectedClip ? (selectedClip.endTime ?? 60) - (selectedClip.startTime ?? 0) : 0

  return (
    <>
      <Head>
        <title>Edit clip – Cutnary</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="flex min-h-screen flex-col bg-[#0a0a0b]">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-[140px]" />
        </div>

        <header className="relative z-10 flex h-14 items-center justify-between gap-2 border-b border-zinc-800/50 bg-[#0a0a0b]/95 px-4 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            {showBackConfirm ? (
              <div className="flex items-center gap-2 rounded-lg bg-zinc-800/90 px-3 py-2 text-sm">
                <span className="text-zinc-300">Your edits are saved. Come back anytime.</span>
                <Link href="/" className="text-blue-400 hover:underline">Go</Link>
                <button type="button" onClick={() => setShowBackConfirm(false)} className="text-zinc-500 hover:text-white">Cancel</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowBackConfirm(true)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            )}
            {selectedClip && (
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative h-10 w-[28px] shrink-0 overflow-hidden rounded bg-zinc-800">
                  <video src={selectedClip.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-semibold text-white">{clipName}</h1>
                  <p className="text-xs text-zinc-500">{formatDuration(clipDurationSec)}</p>
                </div>
                {hasUnsavedChanges && <span className="ml-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" title="Unsaved" />}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={resetToOriginal}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-500 hover:text-white"
            >
              Reset to original
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || !selectedClip}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:bg-blue-500 disabled:opacity-50"
            >
              {exporting && renderStatus === 'rendering' ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Rendering…
                </>
              ) : renderStatus === 'completed' && downloadUrl ? (
                <>✓ Download ready</>
              ) : (
                'Export'
              )}
            </button>
          </div>
        </header>

        {exportError && (
          <div className="relative z-10 mx-4 mt-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400">{exportError}</div>
        )}

        {/* Main: responsive layout */}
        <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:flex-row">
          {/* Mobile: Video first, full width */}
          <section className="order-1 flex w-full flex-col items-center md:order-2 md:flex-1 md:min-h-[400px]">
            {selectedClip ? (
              <VideoPlayer
                src={selectedClip.url}
                subtitles={subtitles}
                words={selectedClip.words}
                currentSubtitleId={currentSubtitleId}
                style={style}
                position={position}
                fontSize={fontSize}
                textColor={textColor}
                backgroundColor={backgroundColor}
                backgroundOpacity={backgroundOpacity}
                trimStart={trimStart}
                trimEnd={trimEnd}
                seekTarget={seekTarget}
                onTimeUpdate={setCurrentTime}
                onDurationChange={handleDurationChange}
                onSubtitleClick={(s) => setCurrentSubtitleId(s.id)}
              />
            ) : (
              <div className="flex aspect-[9/16] min-h-[300px] w-full max-w-md items-center justify-center rounded-xl bg-zinc-900/60">
                <p className="text-zinc-500">Loading clip…</p>
              </div>
            )}
          </section>

          {/* Style panel - collapsible on mobile */}
          <aside className="order-2 w-full md:order-3 md:w-[20%] md:min-w-[220px]">
            <div
              className="md:hidden cursor-pointer rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-3"
              onClick={() => setCollapsedMobile((c) => ({ ...c, style: !c.style }))}
            >
              <h3 className="text-sm font-semibold text-zinc-400">Subtitle style {collapsedMobile.style ? '▼' : '▲'}</h3>
            </div>
            <div className={`${collapsedMobile.style ? 'hidden' : 'block'} md:block h-[320px] md:h-[calc(100vh-14rem)] overflow-y-auto`}>
              <StylePanel
                  style={style}
                  position={position}
                  fontSize={fontSize}
                  textColor={textColor}
                  backgroundColor={backgroundColor}
                  backgroundOpacity={backgroundOpacity}
                  onStyleChange={setStyle}
                  onPositionChange={setPosition}
                  onFontSizeChange={setFontSize}
                  onTextColorChange={setTextColor}
                  onBackgroundColorChange={setBackgroundColor}
                  onBackgroundOpacityChange={setBackgroundOpacity}
                />
            </div>
          </aside>

          {/* Subtitles panel - collapsible on mobile */}
          <aside className="order-3 w-full md:order-1 md:w-[30%] md:min-w-[260px]">
            <div
              className="md:hidden cursor-pointer rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-3"
              onClick={() => setCollapsedMobile((c) => ({ ...c, subtitles: !c.subtitles }))}
            >
              <h3 className="text-sm font-semibold text-zinc-400">Subtitles {collapsedMobile.subtitles ? '▼' : '▲'}</h3>
            </div>
            <div className={`${collapsedMobile.subtitles ? 'hidden' : 'block'} md:block h-[280px] md:h-[calc(100vh-14rem)]`}>
              <SubtitleEditor
                subtitles={subtitles}
                currentSubtitleId={currentSubtitleId}
                onSubtitlesChange={setSubtitles}
                onSelectSubtitle={(c) => {
                  setCurrentSubtitleId(c?.id ?? null)
                  if (c) handleSeekTo(c.start)
                }}
                onSeekTo={handleSeekTo}
              />
            </div>
          </aside>
        </main>

        {/* Trim bar */}
        <div className="relative z-10 px-4 pb-2">
          <TrimBar
            duration={duration}
            trimStart={trimStart}
            trimEnd={trimEnd}
            currentTime={currentTime}
            onTrimChange={handleTrimChange}
            onSeek={handleSeekTo}
          />
        </div>

        {/* Social Caption section */}
        <div className="relative z-10 border-t border-zinc-800/50 bg-zinc-900/30 px-4 py-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">Social Caption</h3>
          <div className="flex flex-wrap gap-3">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="twitter">Twitter</option>
              <option value="youtube">YouTube</option>
            </select>
            <span className="flex items-center text-sm text-zinc-500">
              {socialCaption.length} / {charLimit}
            </span>
            <button
              type="button"
              onClick={handleCopyCaption}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-400 hover:border-blue-500 hover:text-blue-400"
            >
              Copy to clipboard
            </button>
          </div>
          <textarea
            value={socialCaption}
            onChange={(e) => setSocialCaption(e.target.value)}
            placeholder="Write your post caption..."
            maxLength={charLimit + 100}
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            rows={3}
          />
          {socialCaption.length > charLimit && (
            <p className="mt-1 text-xs text-blue-400">Will be truncated to {charLimit} chars for {platform}</p>
          )}
        </div>

        {/* Mobile sticky export */}
        <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center border-t border-zinc-800 bg-[#0a0a0b]/95 p-4 backdrop-blur md:hidden">
          <button
            onClick={handleExport}
            disabled={exporting || !selectedClip}
            className="w-full max-w-sm rounded-xl bg-blue-600 py-3 font-medium text-white disabled:opacity-50"
          >
            {exporting ? 'Rendering…' : 'Export'}
          </button>
        </div>
        <div className="h-20 md:hidden" aria-hidden />
      </div>
    </>
  )
}
