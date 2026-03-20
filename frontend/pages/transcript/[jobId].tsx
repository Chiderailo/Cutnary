/**
 * Transcript Viewer - Video transcript with speaker diarization
 * Click segment to seek video, search, copy, export, edit speaker names
 * Word highlight sync when video plays
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { apiJson } from '@/lib/api'
import { getYouTubeVideoId } from '@/lib/library'
import Header from '@/components/Header'
import { YouTubePlayer, type YouTubePlayerRef } from '@/components/YouTubePlayer'

const SPEAKER_COLORS: Record<string, string> = {
  'Speaker 1': 'text-violet-400 border-violet-500/50',
  'Speaker 2': 'text-emerald-400 border-emerald-500/50',
  'Speaker 3': 'text-amber-400 border-amber-500/50',
  'Speaker 4': 'text-rose-400 border-rose-500/50',
}

function getSpeakerColor(speaker: string): string {
  return SPEAKER_COLORS[speaker] ?? 'text-zinc-400 border-zinc-500/50'
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatTimeSrt(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.floor((sec % 1) * 1000)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
}

interface TranscriptWord {
  word: string
  start: number
  end: number
  speaker?: string
}

interface TranscriptSegment {
  speaker: string
  start: number
  end: number
  text: string
  words: TranscriptWord[]
}

export default function TranscriptPage() {
  const router = useRouter()
  const { jobId } = router.query
  const { isAuthenticated, isLoading } = useAuth()
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [speakerSeparation, setSpeakerSeparation] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [status, setStatus] = useState<string>('loading')
  const playerRef = useRef<YouTubePlayerRef>(null)
  const [search, setSearch] = useState('')
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({})
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/auth/login')
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (!jobId || typeof jobId !== 'string') return
    apiJson<{
      success: boolean
      status: string
      segments?: TranscriptSegment[]
      video_url?: string
      video_title?: string
      speaker_separation?: boolean
    }>(`/api/transcript/${jobId}`)
      .then((data) => {
        setStatus(data.status)
        if (data.segments) setSegments(data.segments)
        if (data.video_url) setVideoUrl(data.video_url)
        if (data.video_title) setVideoTitle(data.video_title)
        if (typeof data.speaker_separation === 'boolean') setSpeakerSeparation(data.speaker_separation)
      })
      .catch(() => setStatus('failed'))
  }, [jobId])

  const videoId = getYouTubeVideoId(videoUrl)

  const displaySpeaker = (speaker: string) => speakerNames[speaker] ?? speaker

  const filteredSegments = search.trim()
    ? segments.filter((s) =>
        s.text.toLowerCase().includes(search.toLowerCase()) ||
        (speakerSeparation && displaySpeaker(s.speaker).toLowerCase().includes(search.toLowerCase()))
      )
    : segments

  const fullTranscript = useMemo(() => {
    if (speakerSeparation) {
      return segments.map((s) => `[${(speakerNames[s.speaker] ?? s.speaker)}] ${formatTime(s.start)} - ${formatTime(s.end)}\n"${s.text}"`).join('\n\n')
    }
    return segments.map((s) => `${formatTime(s.start)} - ${formatTime(s.end)}\n${s.text}`).join('\n\n')
  }, [segments, speakerSeparation, speakerNames])

  const allWords = useMemo(() => {
    const out: { word: TranscriptWord; segIdx: number; wordIdx: number }[] = []
    segments.forEach((seg, si) => {
      seg.words?.forEach((w, wi) => out.push({ word: w, segIdx: si, wordIdx: wi }))
    })
    return out
  }, [segments])

  const activeWord = useMemo(() => {
    for (let i = allWords.length - 1; i >= 0; i--) {
      const { word } = allWords[i]
      if (currentTime >= word.start && currentTime <= word.end) return i
    }
    return -1
  }, [allWords, currentTime])

  const activeSegRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (activeWord >= 0 && activeSegRef.current) {
      activeSegRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeWord])

  const exportTxt = () => {
    const blob = new Blob([fullTranscript], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `transcript-${jobId}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const exportSrt = () => {
    let srt = ''
    let i = 1
    for (const seg of segments) {
      srt += `${i}\n`
      srt += `${formatTimeSrt(seg.start)} --> ${formatTimeSrt(seg.end)}\n`
      srt += speakerSeparation ? `[${displaySpeaker(seg.speaker)}] ${seg.text}` : seg.text
      srt += '\n\n'
      i++
    }
    const blob = new Blob([srt], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `transcript-${jobId}.srt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const copyTranscript = () => {
    navigator.clipboard.writeText(fullTranscript)
  }

  const handleSegmentClick = useCallback((seg: TranscriptSegment) => {
    const start = Math.max(0, seg.start - 0.3)
    playerRef.current?.seekTo(start)
  }, [])

  if (status === 'loading' || status === 'queued' || status === 'downloading' || status === 'transcribing') {
    return (
      <>
        <Head><title>Transcript – Cutnary</title></Head>
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            <p className="mt-4 text-zinc-500">{status}...</p>
          </div>
        </div>
      </>
    )
  }

  if (status === 'failed') {
    return (
      <>
        <Head><title>Transcript – Cutnary</title></Head>
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <p className="text-red-400">Transcript failed to load.</p>
            <Link href="/" className="mt-4 inline-block text-violet-400 hover:text-violet-300">← Back to home</Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{videoTitle || 'Transcript'} – Cutnary</title>
      </Head>
      <Header />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-500 hover:text-white">← Back</Link>
          <h1 className="truncate text-xl font-semibold text-white">{videoTitle || 'Transcript'}</h1>
          <div className="w-20" />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Video – 30% on desktop */}
          <div className="w-full shrink-0 lg:w-[30%]">
            {videoId ? (
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                <YouTubePlayer
                  ref={playerRef}
                  videoId={videoId}
                  onTimeUpdate={setCurrentTime}
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl bg-zinc-900">
                <p className="text-zinc-500">No video</p>
              </div>
            )}
          </div>

          {/* Transcript */}
          <div ref={containerRef} className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Search transcript..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={copyTranscript}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={exportTxt}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
              >
                Export .txt
              </button>
              <button
                type="button"
                onClick={exportSrt}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
              >
                Export .srt
              </button>
            </div>

            <div className="space-y-4">
              {filteredSegments.length === 0 ? (
                <p className="text-zinc-500">No segments.</p>
              ) : (
                filteredSegments.map((seg, i) => {
                  const segWords = seg.words ?? []
                  const origIdx = segments.indexOf(seg)
                  let wordIdxOffset = 0
                  for (let j = 0; j < origIdx; j++) wordIdxOffset += (segments[j].words ?? []).length
                  const isActiveSeg = activeWord >= 0 && allWords[activeWord]?.segIdx === origIdx
                  return (
                    <div
                      key={i}
                      ref={isActiveSeg ? activeSegRef : undefined}
                      onClick={() => handleSegmentClick(seg)}
                      className={`cursor-pointer rounded-lg border p-4 transition-colors hover:border-violet-500/30 hover:bg-zinc-900/80 ${
                        isActiveSeg ? 'border-violet-500/50 bg-zinc-900/80' : 'border-zinc-800 bg-zinc-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {speakerSeparation && (
                          editingSpeaker === seg.speaker ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onBlur={() => {
                                if (editName.trim()) {
                                  setSpeakerNames((s) => ({ ...s, [seg.speaker]: editName.trim() }))
                                }
                                setEditingSpeaker(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (editName.trim()) {
                                    setSpeakerNames((s) => ({ ...s, [seg.speaker]: editName.trim() }))
                                  }
                                  setEditingSpeaker(null)
                                }
                              }}
                              autoFocus
                              className="rounded bg-zinc-800 px-2 py-1 text-white focus:outline-none"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span
                              className={`rounded border px-2 py-0.5 text-xs font-medium ${getSpeakerColor(seg.speaker)}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingSpeaker(seg.speaker)
                                setEditName(displaySpeaker(seg.speaker))
                              }}
                            >
                              {displaySpeaker(seg.speaker)}
                            </span>
                          )
                        )}
                        <span className="text-xs text-zinc-500">
                          {formatTime(seg.start)} – {formatTime(seg.end)}
                        </span>
                      </div>
                      <p className="mt-2 text-zinc-300">
                        {segWords.length > 0 ? (
                          segWords.map((w, wi) => {
                            const globalIdx = wordIdxOffset + wi
                            const isHighlight = activeWord === globalIdx
                            return (
                              <span
                                key={wi}
                                className={isHighlight ? 'bg-violet-500/40 text-white' : ''}
                              >
                                {w.word}{' '}
                              </span>
                            )
                          })
                        ) : (
                          seg.text
                        )}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
