/**
 * YouTubePlayer - Embed YouTube video with IFrame API for seek and time sync.
 * Used for transcript page: click segment to seek, highlight words as video plays.
 */

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback, useId } from 'react'

const YT_SCRIPT = 'https://www.youtube.com/iframe_api'

interface YTPlayerInstance {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  playVideo: () => void
  pauseVideo: () => void
  getCurrentTime: () => number
  getPlayerState: () => number
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          videoId: string
          playerVars?: Record<string, number | string>
          events?: { onReady?: (e: { target: YTPlayerInstance }) => void }
        }
      ) => YTPlayerInstance
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

export interface YouTubePlayerRef {
  seekTo: (seconds: number) => void
  play: () => void
}

interface YouTubePlayerProps {
  videoId: string
  onTimeUpdate?: (currentTime: number) => void
  className?: string
}

export const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(
  function YouTubePlayer({ videoId, onTimeUpdate, className }, ref) {
    const id = useId().replace(/:/g, '-')
    const containerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<YTPlayerInstance | null>(null)
    const rafRef = useRef<number>()

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        playerRef.current?.seekTo(seconds, true)
        playerRef.current?.playVideo()
      },
      play: () => playerRef.current?.playVideo(),
    }))

    const tick = useCallback(() => {
      const player = playerRef.current
      if (player && onTimeUpdate && player.getPlayerState() === 1) {
        onTimeUpdate(player.getCurrentTime())
      }
      rafRef.current = requestAnimationFrame(tick)
    }, [onTimeUpdate])

    useEffect(() => {
      if (!videoId) return

      const ensureYT = (): Promise<void> => {
        if (window.YT?.Player) return Promise.resolve()
        return new Promise((resolve) => {
          if (window.YT?.Player) {
            resolve()
            return
          }
          const prev = window.onYouTubeIframeAPIReady
          window.onYouTubeIframeAPIReady = () => {
            prev?.()
            resolve()
          }
          if (document.querySelector(`script[src="${YT_SCRIPT}"]`)) {
            if (window.YT?.Player) resolve()
            return
          }
          const script = document.createElement('script')
          script.src = YT_SCRIPT
          script.async = true
          document.head.appendChild(script)
        })
      }

      let mounted = true
      ensureYT().then(() => {
        if (!mounted || !containerRef.current) return
        const player = new window.YT!.Player(id, {
          videoId,
          height: '100%',
          width: '100%',
          playerVars: { enablejsapi: 1 },
          events: {
            onReady: (e) => {
              playerRef.current = e.target
            },
          },
        })
        if (player?.seekTo) playerRef.current = player
      })

      return () => {
        mounted = false
        playerRef.current = null
      }
    }, [videoId, id])

    useEffect(() => {
      if (onTimeUpdate) {
        rafRef.current = requestAnimationFrame(tick)
      }
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }, [onTimeUpdate, tick])

    if (!videoId) return null

    return <div ref={containerRef} id={id} className={className} />
  }
)
