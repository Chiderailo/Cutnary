/**
 * VideoPlayer - Video preview with subtitle overlay
 *
 * Renders the video and displays subtitles as absolutely positioned divs
 * (not burned in). Uses requestAnimationFrame for smooth 60fps sync with
 * video.currentTime. Karaoke highlights each word in blue as spoken.
 */

import { useRef, useEffect, useCallback, useState } from 'react'

export interface SubtitleWord {
  word: string
  start: number
  end: number
}

export interface Subtitle {
  id: string
  start: number
  end: number
  text: string
  words?: SubtitleWord[]
}

/** @deprecated Use Subtitle */
export type Caption = Subtitle
/** @deprecated Use SubtitleWord */
export type CaptionWord = SubtitleWord

export type CaptionStyle =
  | 'simple'
  | 'bold'
  | 'karaoke'
  | 'glitch'
  | 'highlighter'
export type CaptionPosition = 'top' | 'middle' | 'bottom'
export type FontSize = 'small' | 'medium' | 'large'

interface VideoPlayerProps {
  src: string
  subtitles: Subtitle[]
  words?: SubtitleWord[]
  currentSubtitleId: string | null
  style: CaptionStyle
  position: CaptionPosition
  fontSize: FontSize
  textColor: string
  backgroundColor: string
  backgroundOpacity: number
  trimStart: number
  trimEnd: number
  seekTarget?: number | null
  onTimeUpdate: (currentTime: number) => void
  onDurationChange: (duration: number) => void
  onSubtitleClick?: (subtitle: Subtitle) => void
}

const FONT_SIZES: Record<FontSize, string> = {
  small: 'text-base',
  medium: 'text-xl',
  large: 'text-3xl',
}

const POSITION_CLASSES: Record<CaptionPosition, string> = {
  top: 'top-4',
  middle: 'top-1/2 -translate-y-1/2',
  bottom: 'bottom-4',
}

export default function VideoPlayer({
  src,
  subtitles,
  words,
  currentSubtitleId,
  style,
  position,
  fontSize,
  textColor,
  backgroundColor,
  backgroundOpacity,
  trimStart,
  trimEnd,
  seekTarget,
  onTimeUpdate,
  onDurationChange,
  onSubtitleClick,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [builtSubtitles, setBuiltSubtitles] = useState<Subtitle[]>([])

  useEffect(() => {
    if (!words || words.length === 0) {
      setBuiltSubtitles([])
      return
    }
    const phrases: Subtitle[] = []
    let current: SubtitleWord[] = []
    for (const word of words) {
      current.push(word)
      if (current.length >= 4) {
        phrases.push({
          id: `sub-${phrases.length}`,
          start: current[0].start,
          end: current[current.length - 1].end,
          text: current.map((w) => w.word).join(' '),
          words: [...current],
        })
        current = []
      }
    }
    if (current.length > 0) {
      phrases.push({
        id: `sub-${phrases.length}`,
        start: current[0].start,
        end: current[current.length - 1].end,
        text: current.map((w) => w.word).join(' '),
        words: [...current],
      })
    }
    setBuiltSubtitles(phrases)
  }, [words])

  const displaySubtitles = builtSubtitles.length > 0 ? builtSubtitles : subtitles

  // Use clip time for subtitle sync (subtitles are in clip-relative time 0..duration)
  const displayTime = currentTime
  const clipDuration = duration

  // requestAnimationFrame loop for smooth subtitle sync (60fps, not setInterval)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let rafId: number
    const tick = () => {
      if (video.readyState >= 2) {
        const t = video.currentTime
        setCurrentTime(t)
        onTimeUpdate(t)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [onTimeUpdate])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }, [])

  const handleDurationChange = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const d = video.duration
    setDuration(d)
    onDurationChange(d)
  }, [onDurationChange])

  // Seek when parent requests (e.g. caption click)
  useEffect(() => {
    if (seekTarget != null && videoRef.current) {
      videoRef.current.currentTime = seekTarget
      setCurrentTime(seekTarget)
      onTimeUpdate(seekTarget)
    }
  }, [seekTarget, onTimeUpdate])

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const video = videoRef.current
      if (!video || !duration) return
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      const x = e.clientX - rect.left
      const pct = Math.max(0, Math.min(1, x / rect.width))
      const seekTo = pct * duration
      video.currentTime = seekTo
      setCurrentTime(seekTo)
      onTimeUpdate(seekTo)
    },
    [duration, onTimeUpdate]
  )

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const activeSubtitle = displaySubtitles.find(
    (s) => displayTime >= s.start && displayTime <= s.end
  ) ?? null

  const handleVideoClick = useCallback(() => togglePlay(), [togglePlay])
  const handleVideoDoubleClick = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.requestFullscreen) video.requestFullscreen()
  }, [])

  // Keyboard: Space=play/pause, Left/Right=seek 5s
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const video = videoRef.current
      if (!video) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (video.paused) video.play()
        else video.pause()
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        video.currentTime = Math.max(0, video.currentTime - 5)
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        video.currentTime = Math.min(video.duration, video.currentTime + 5)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      {/* Video container with overlay - click play/pause, double-click fullscreen */}
      <div
        className="relative aspect-[9/16] min-h-[300px] w-full max-w-md overflow-hidden rounded-xl bg-black md:min-h-[400px]"
        onClick={handleVideoClick}
        onDoubleClick={handleVideoDoubleClick}
      >
        <video
          ref={videoRef}
          src={src}
          className="h-full w-full object-contain"
          playsInline
          preload="metadata"
          onDurationChange={handleDurationChange}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          style={{
            clipPath: `inset(0 0 0 0)`,
          }}
        />

        {/* Subtitle overlay */}
        <div
          className={`pointer-events-none absolute left-0 right-0 flex justify-center px-4 ${POSITION_CLASSES[position]}`}
        >
          {activeSubtitle && (
            <SubtitleOverlay
              subtitle={activeSubtitle}
              currentTime={displayTime}
              style={style}
              fontSize={fontSize}
              textColor={textColor}
              backgroundColor={backgroundColor}
              backgroundOpacity={backgroundOpacity}
              isActive={activeSubtitle.id === currentSubtitleId}
              onClick={() => onSubtitleClick?.(activeSubtitle)}
            />
          )}
        </div>

        {/* Play overlay - pointer-events on parent for click */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity hover:bg-black/30"
          aria-hidden
        >
          {!isPlaying && (
            <div className="rounded-full bg-white/90 p-4 shadow-lg">
              <svg
                className="h-12 w-12 text-blue-600"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* Current timestamp */}
        <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 font-mono text-xs text-white">
          {formatTime(displayTime)} / {formatTime(clipDuration)}
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          {isPlaying ? (
            <>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              Pause
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play
            </>
          )}
        </button>
        <div
          className="flex-1 cursor-pointer rounded-lg bg-zinc-800 py-2"
          onClick={handleSeek}
          role="progressbar"
          aria-valuenow={displayTime}
          aria-valuemin={0}
          aria-valuemax={clipDuration}
        >
          <div
            className="h-1 rounded-full bg-blue-600 transition-all"
            style={{
              width: `${clipDuration > 0 ? (displayTime / clipDuration) * 100 : 0}%`,
            }}
          />
        </div>
        <span className="font-mono text-sm text-zinc-500">
          {formatTime(displayTime)} / {formatTime(clipDuration)}
        </span>
      </div>
    </div>
  )
}

/** Renders a single subtitle with the selected style */
function SubtitleOverlay({
  subtitle,
  currentTime,
  style,
  fontSize,
  textColor,
  backgroundColor,
  backgroundOpacity,
  isActive,
  onClick,
}: {
  subtitle: Subtitle
  currentTime: number
  style: CaptionStyle
  fontSize: FontSize
  textColor: string
  backgroundColor: string
  backgroundOpacity: number
  isActive: boolean
  onClick?: () => void
}) {
  const baseClass = `${FONT_SIZES[fontSize]} font-medium text-center max-w-full`

  const styleClasses: Record<CaptionStyle, string> = {
    simple: '',
    bold: 'font-black drop-shadow-[0_2px_0_black]',
    karaoke: 'font-bold',
    glitch:
      'font-bold tracking-wider',
    highlighter: 'px-2 py-1 rounded',
  }

  const bgStyle =
    style === 'highlighter'
      ? { backgroundColor: `${backgroundColor}${Math.round(backgroundOpacity * 255).toString(16).padStart(2, '0')}` }
      : {}

  if (style === 'karaoke' && subtitle.words?.length) {
    return (
      <div
        className={`${baseClass} ${styleClasses.karaoke} pointer-events-auto cursor-pointer rounded px-2 py-1 ${
          isActive ? 'ring-2 ring-blue-500' : ''
        }`}
        style={{ color: textColor, ...bgStyle }}
        onClick={onClick}
      >
        {subtitle.words.map((w, i) => {
          const isHighlighted = currentTime >= w.start && currentTime <= w.end
          return (
            <span
              key={i}
              className={
                isHighlighted
                  ? 'rounded bg-blue-500/80 px-0.5 text-white'
                  : 'text-white/90'
              }
            >
              {w.word}{' '}
            </span>
          )
        })}
      </div>
    )
  }

  if (style === 'glitch') {
    return (
      <div
        className={`${baseClass} ${styleClasses.glitch} pointer-events-auto cursor-pointer ${isActive ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          color: textColor,
          textShadow: `2px 0 #3b82f6, -2px 0 #38bdf8, 0 0 8px ${textColor}`,
        }}
        onClick={onClick}
      >
        {subtitle.text}
      </div>
    )
  }

  return (
    <div
      className={`${baseClass} ${styleClasses[style]} pointer-events-auto cursor-pointer ${isActive ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        color: textColor,
        ...bgStyle,
        ...(style !== 'highlighter' && {
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }),
      }}
      onClick={onClick}
    >
      {subtitle.text}
    </div>
  )
}
