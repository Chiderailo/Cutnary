/**
 * ClipCard - Displays a single generated clip with video preview and actions
 * Features: video player, duration badge, download, landscape/portrait toggle
 * Uses glass morphism and hover effects for a polished SaaS look
 */

import { useState } from 'react'

export interface ClipData {
  id: string
  url: string
  startTime?: number
  endTime?: number
  description?: string
  /** Alternative URL for portrait/landscape variant if available */
  landscapeUrl?: string
  portraitUrl?: string
}

interface ClipCardProps {
  clip: ClipData
  /** Optional engagement score for sorting/display */
  score?: number
}

function formatDuration(start?: number, end?: number): string {
  if (start == null || end == null) return '—'
  const sec = Math.round(end - start)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

export default function ClipCard({ clip, score }: ClipCardProps) {
  const [variant, setVariant] = useState<'landscape' | 'portrait'>('landscape')
  const videoUrl =
    variant === 'landscape'
      ? clip.landscapeUrl ?? clip.url
      : clip.portraitUrl ?? clip.url

  const duration = formatDuration(clip.startTime, clip.endTime)

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = `clip-${clip.id}.mp4`
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900/60 
                 backdrop-blur-sm transition-all duration-300 hover:border-violet-500/30 
                 hover:shadow-lg hover:shadow-violet-500/10"
    >
      {/* Video preview */}
      <div className="relative aspect-video bg-zinc-900">
        <video
          src={videoUrl}
          controls
          playsInline
          className="h-full w-full object-contain"
          preload="metadata"
        />
        {/* Duration badge - top left */}
        <div className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {duration}
        </div>
        {/* Score badge - top right (optional) */}
        {score != null && (
          <div className="absolute right-2 top-2 rounded-md bg-violet-600/80 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {score}% viral
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="p-4">
        {clip.description && (
          <p className="mb-3 line-clamp-2 text-sm text-zinc-400">
            {clip.description}
          </p>
        )}

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download button */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 
                       px-4 py-2 text-sm font-medium text-white shadow-lg transition-all duration-200 
                       hover:from-violet-500 hover:to-purple-500 hover:shadow-violet-500/25 
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

          {/* Landscape / Portrait toggle - show if both variants exist */}
          {(clip.landscapeUrl || clip.portraitUrl) && (
            <div className="flex rounded-lg border border-zinc-600/50 p-0.5">
              <button
                onClick={() => setVariant('landscape')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  variant === 'landscape'
                    ? 'bg-violet-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Landscape
              </button>
              <button
                onClick={() => setVariant('portrait')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  variant === 'portrait'
                    ? 'bg-violet-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Portrait
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
