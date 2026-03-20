/**
 * TrimBar - Video timeline with trim handles
 *
 * Shows the full clip duration as a timeline. Draggable start/end handles
 * define the trim range for export. Current playhead position is shown.
 * Displays trimmed clip duration.
 */

import { useRef, useState, useCallback, useEffect } from 'react'

interface TrimBarProps {
  duration: number
  trimStart: number
  trimEnd: number
  currentTime: number
  onTrimChange: (start: number, end: number) => void
  onSeek: (time: number) => void
}

export default function TrimBar({
  duration,
  trimStart,
  trimEnd,
  currentTime,
  onTrimChange,
  onSeek,
}: TrimBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null)

  const toPct = (t: number) => (duration > 0 ? (t / duration) * 100 : 0)
  const fromPct = (pct: number) => (duration * pct) / 100

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!barRef.current || duration <= 0) return
      const rect = barRef.current.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const time = fromPct(pct)
      onSeek(time)
    },
    [duration, onSeek]
  )

  const handleMouseDown = (handle: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(handle)
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!barRef.current || !dragging || duration <= 0) return
      const rect = barRef.current.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const time = fromPct(pct)

      if (dragging === 'start') {
        const newStart = Math.min(time, trimEnd - 1)
        onTrimChange(newStart, trimEnd)
      } else {
        const newEnd = Math.max(time, trimStart + 1)
        onTrimChange(trimStart, newEnd)
      }
    },
    [dragging, duration, trimStart, trimEnd, onTrimChange]
  )

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  useEffect(() => {
    if (!dragging) return
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const trimmedDuration = Math.max(0, trimEnd - trimStart)

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-4 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">Trim</span>
        <span className="font-mono text-sm text-zinc-400">
          {formatTime(trimmedDuration)} (from {formatTime(trimStart)} to{' '}
          {formatTime(trimEnd)})
        </span>
      </div>
      <div
        ref={barRef}
        className="relative h-10 cursor-pointer rounded-lg bg-zinc-800"
        onClick={handleBarClick}
      >
        {/* Full timeline background */}
        <div className="absolute inset-0 rounded-lg" />

        {/* Trimmed region (highlight) */}
        <div
          className="absolute top-1 bottom-1 rounded bg-zinc-700"
          style={{
            left: `${toPct(trimStart)}%`,
            width: `${toPct(trimEnd - trimStart)}%`,
          }}
        />

        {/* Start handle */}
        <div
          className="absolute top-0 bottom-0 w-2 cursor-ew-resize rounded-l bg-blue-500 hover:bg-blue-400"
          style={{ left: `${toPct(trimStart)}%` }}
          onMouseDown={handleMouseDown('start')}
          role="slider"
          aria-valuenow={trimStart}
          aria-valuemin={0}
          aria-valuemax={trimEnd}
        />

        {/* End handle */}
        <div
          className="absolute top-0 bottom-0 w-2 cursor-ew-resize rounded-r bg-blue-500 hover:bg-blue-400"
          style={{ left: `calc(${toPct(trimEnd)}% - 8px)` }}
          onMouseDown={handleMouseDown('end')}
          role="slider"
          aria-valuenow={trimEnd}
          aria-valuemin={trimStart}
          aria-valuemax={duration}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
          style={{ left: `${toPct(currentTime)}%` }}
        />
      </div>
    </div>
  )
}
