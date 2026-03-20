/**
 * ClipCard - Displays a single generated clip with video preview and actions
 * Features: video player, duration badge, Edit, Download
 * Uses glass morphism and hover effects for a polished SaaS look
 */

import Link from 'next/link'

export interface ClipData {
  id: string
  url: string
  startTime?: number
  endTime?: number
  description?: string
  /** Social caption for post (AI-generated, curiosity-driven) */
  viralDescription?: string
  /** Virality/engagement score 0-100 (number or JSON string) */
  score?: number | string
}

interface ClipCardProps {
  clip: ClipData
  /** Optional engagement score for sorting/display (overrides clip.score) */
  score?: number
  /** Job ID for editor link (enables Edit button) */
  jobId?: string
}

function formatDuration(start?: number, end?: number): string {
  if (start == null || end == null) return '—'
  const sec = Math.round(end - start)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

/** Badge style: green 🔥 >70, yellow ⚡ 40-70, gray 📉 <40 */
function scoreBadge(score: number): { emoji: string; className: string } {
  if (score > 70) return { emoji: '🔥', className: 'bg-blue-500/95 text-white' }
  if (score >= 40) return { emoji: '⚡', className: 'bg-blue-400/90 text-white' }
  return { emoji: '📉', className: 'bg-zinc-600/95 text-zinc-300' }
}

/** Extract clip filename from URL for editor query */
function clipFilename(url: string): string {
  try {
    const path = new URL(url, 'http://localhost').pathname
    return path.split('/').pop() || ''
  } catch {
    return url.split('/').pop() || ''
  }
}

export default function ClipCard({ clip, score: scoreProp, jobId }: ClipCardProps) {
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
  const badge = hasScore ? scoreBadge(scoreValue) : null

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = clip.url
    a.download = `clip-${clip.id}.mp4`
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900/60 
                 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/30
                 hover:shadow-lg hover:shadow-blue-500/10"
    >
      {/* Video preview */}
      <div className="relative aspect-video w-full bg-zinc-900">
        <video
          src={clip.url}
          controls
          playsInline
          className="h-full w-full object-contain"
          preload="metadata"
        />
        {/* Duration badge - top left */}
        <div className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {duration}
        </div>
      </div>

      {/* Card content */}
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

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2">
          {jobId && (
            <Link
              href={`/editor/${jobId}?clip=${encodeURIComponent(clipFilename(clip.url))}`}
              className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800/80 
                         px-4 py-2 text-sm font-medium text-white transition-all duration-200 
                         hover:border-blue-500/50 hover:bg-zinc-700"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
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
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg bg-blue-600 
                       px-4 py-2 text-sm font-medium text-white shadow-lg transition-all duration-200 
                       hover:bg-blue-500 hover:shadow-blue-500/25 
                       active:scale-[0.98]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
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

        {/* Virality score – below download button */}
        {badge && (
          <p
            className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${badge.className}`}
          >
            {badge.emoji} {scoreValue}/100
          </p>
        )}
      </div>
    </div>
  )
}
