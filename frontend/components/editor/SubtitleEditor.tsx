/**
 * SubtitleEditor - Left panel subtitle list
 *
 * Displays subtitles (synced text shown during video) with timestamps.
 * Features: search/filter, bulk select & delete, drag to reorder.
 * Each row: timestamp | text | edit/delete.
 */

import { useState } from 'react'
import type { Subtitle, SubtitleWord } from './VideoPlayer'

interface SubtitleEditorProps {
  subtitles: Subtitle[]
  currentSubtitleId: string | null
  onSubtitlesChange: (subtitles: Subtitle[]) => void
  onSelectSubtitle: (subtitle: Subtitle | null) => void
  onSeekTo?: (start: number) => void
}

function formatTimestamp(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  const cs = Math.floor((sec % 1) * 100)
  return `${m}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
}

function generateId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function SubtitleEditor({
  subtitles,
  currentSubtitleId,
  onSubtitlesChange,
  onSelectSubtitle,
  onSeekTo,
}: SubtitleEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const filtered =
    !searchQuery.trim()
      ? subtitles
      : subtitles.filter((s) =>
          s.text.toLowerCase().includes(searchQuery.toLowerCase())
        )

  const handleStartEdit = (s: Subtitle) => {
    setEditingId(s.id)
    setEditText(s.text)
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    const next = subtitles.map((s) =>
      s.id === editingId ? { ...s, text: editText.trim() || s.text } : s
    )
    onSubtitlesChange(next)
    setEditingId(null)
    setEditText('')
  }

  const handleDelete = (id: string) => {
    const next = subtitles.filter((s) => s.id !== id)
    onSubtitlesChange(next)
    if (currentSubtitleId === id) onSelectSubtitle(next[0] ?? null)
    setEditingId(null)
    setSelectedIds((prev) => {
      const nextSet = new Set(prev)
      nextSet.delete(id)
      return nextSet
    })
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    const next = subtitles.filter((s) => !selectedIds.has(s.id))
    onSubtitlesChange(next)
    if (currentSubtitleId && selectedIds.has(currentSubtitleId)) {
      onSelectSubtitle(next[0] ?? null)
    }
    setSelectedIds(new Set())
    setEditingId(null)
  }

  const handleAdd = () => {
    const lastEnd = subtitles.length ? subtitles[subtitles.length - 1].end : 0
    const newSub: Subtitle = {
      id: generateId(),
      start: lastEnd,
      end: lastEnd + 3,
      text: 'New subtitle',
      words: [{ word: 'New subtitle', start: lastEnd, end: lastEnd + 3 }],
    }
    onSubtitlesChange([...subtitles, newSub])
    onSelectSubtitle(newSub)
    setEditingId(newSub.id)
    setEditText(newSub.text)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)))
    }
  }

  const handleDragStart = (id: string) => setDraggedId(id)
  const handleDragEnd = () => setDraggedId(null)
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return
    const draggedIdx = subtitles.findIndex((s) => s.id === draggedId)
    const targetIdx = subtitles.findIndex((s) => s.id === targetId)
    if (draggedIdx < 0 || targetIdx < 0) return
    const next = [...subtitles]
    const [removed] = next.splice(draggedIdx, 1)
    next.splice(targetIdx, 0, removed)
    onSubtitlesChange(next)
    setDraggedId(null)
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-700/50 bg-zinc-900/60 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-zinc-700/50 px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Subtitles
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            + Add
          </button>
        </div>
      </div>

      <div className="border-b border-zinc-700/50 px-2 py-2">
        <input
          type="search"
          placeholder="Search subtitles…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
        />
        {filtered.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs text-blue-400 hover:underline"
            >
              {selectedIds.size === filtered.length ? 'Deselect all' : 'Select all'}
            </button>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="text-xs text-red-400 hover:underline"
              >
                Delete {selectedIds.size} selected
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {subtitles.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            No subtitles yet.
            <br />
            <button
              type="button"
              onClick={handleAdd}
              className="mt-2 text-blue-400 hover:underline"
            >
              Add your first subtitle
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            No matches for &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((s) => (
              <div
                key={s.id}
                draggable
                onDragStart={() => handleDragStart(s.id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(s.id)}
                className={`group rounded-lg border px-3 py-2 transition-colors ${
                  currentSubtitleId === s.id
                    ? 'border-blue-500/50 bg-blue-500/10'
                    : 'border-transparent hover:bg-zinc-800/60'
                } ${draggedId === s.id ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="mt-1 shrink-0 rounded border-zinc-600"
                  />
                  <span
                    className="cursor-grab shrink-0 py-1 text-zinc-500 hover:text-zinc-400"
                    title="Drag to reorder"
                  >
                    ⋮⋮
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSubtitle(s)
                      onSeekTo?.(s.start)
                    }}
                    className="shrink-0 font-mono text-xs text-zinc-500 hover:text-blue-400"
                    title="Seek to subtitle"
                  >
                    {formatTimestamp(s.start)}
                  </button>
                  <div className="min-w-0 flex-1">
                    {editingId === s.id ? (
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit()
                          if (e.key === 'Escape') {
                            setEditingId(null)
                            setEditText('')
                          }
                        }}
                        className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <p
                        className="cursor-pointer text-sm text-white line-clamp-2"
                        onClick={() => handleStartEdit(s)}
                      >
                        {s.text}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(s)}
                      className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-white"
                      aria-label="Edit"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      className="rounded p-1 text-zinc-500 hover:bg-red-500/20 hover:text-red-400"
                      aria-label="Delete"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export type { Subtitle, SubtitleWord }
