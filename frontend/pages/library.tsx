/**
 * Library Page - My videos and clips (WayinVideo/Opus Clip style)
 * Dark theme, black/white + blue accents, grid of video cards
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { getLibrary, removeFromLibrary, updateLibraryEntry, type LibraryEntry } from '@/lib/library'
import Header from '@/components/Header'

const CLIP_LENGTH_LABELS: Record<string, string> = {
  auto: 'Auto (<90s)',
  '<30s': '<30s',
  '30-60s': '30s-60s',
  '60-90s': '60s-90s',
  '90-3min': '90s-3min',
  '>3min': '>3min',
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffM = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)
  if (diffM < 60) return `${diffM} min ago`
  if (diffH < 24) return `${diffH} hours ago`
  if (diffD < 7) return `${diffD} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function clipFilename(url: string): string {
  try {
    return new URL(url).pathname.split('/').pop() || ''
  } catch {
    return url.split('/').pop() || ''
  }
}

export default function LibraryPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [entries, setEntries] = useState<LibraryEntry[]>([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'most_clips'>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/auth/login')
  }, [isLoading, isAuthenticated, router])

  const loadLibrary = useCallback(() => {
    setEntries(getLibrary())
  }, [])

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase()
    return (
      e.videoTitle.toLowerCase().includes(q) ||
      e.createdAt.toLowerCase().includes(q)
    )
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    return (b.clips?.length ?? 0) - (a.clips?.length ?? 0)
  })

  const handleDelete = (id: string) => {
    removeFromLibrary(id)
    setEntries(getLibrary())
    setDeleteId(null)
  }

  const handleDownloadAll = (entry: LibraryEntry) => {
    entry.clips?.forEach((c, i) => {
      const a = document.createElement('a')
      a.href = c.url
      a.download = `clip_${i + 1}.mp4`
      a.target = '_blank'
      a.click()
    })
  }

  const firstClipUrl = (entry: LibraryEntry) =>
    entry.clips?.[0]?.url ? `/editor/${String(entry.id)}?clip=${encodeURIComponent(clipFilename(entry.clips[0].url))}` : '#'

  return (
    <>
      <Head>
        <title>My Library – Cutnary</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-[#0a0a0b]">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-[140px]" />
        </div>

        <Header />

        <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-white">My Library</h1>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="search"
                placeholder="Search by title or date…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none sm:w-64"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="most_clips">Most clips</option>
              </select>
              <div className="flex rounded-lg border border-zinc-700 bg-zinc-900 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`rounded px-3 py-1.5 text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
                  aria-label="Grid view"
                >
                  ⊞
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`rounded px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
                  aria-label="List view"
                >
                  ☰
                </button>
              </div>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 py-24 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800">
                <svg className="h-10 w-10 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="mb-2 text-lg font-medium text-white">No videos yet</p>
              <p className="mb-6 text-zinc-500">Start by pasting a YouTube link!</p>
              <Link
                href="/"
                className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-500"
              >
                Create your first clip
              </Link>
            </div>
          ) : sorted.length === 0 ? (
            <p className="py-12 text-center text-zinc-500">No matches for your search.</p>
          ) : (
            <div
              className={`grid gap-6 transition-opacity duration-300 ${
                viewMode === 'grid'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1'
              }`}
            >
              {sorted.map((entry, i) => (
                <LibraryCard
                  key={entry.id}
                  entry={entry}
                  index={i}
                  viewMode={viewMode}
                  onDelete={() => setDeleteId(entry.id)}
                  onRename={() => setRenameId(entry.id)}
                  onShare={() => {
                    navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/?job=${String(entry.id)}`)
                  }}
                  onDownloadAll={() => handleDownloadAll(entry)}
                  editHref={firstClipUrl(entry)}
                  viewClipsHref={`/?job=${String(entry.id)}#clips`}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {deleteId && (
        <DeleteModal
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </>
  )
}

function LibraryCard({
  entry,
  index,
  viewMode,
  onDelete,
  onRename,
  onShare,
  onDownloadAll,
  editHref,
  viewClipsHref,
}: {
  entry: LibraryEntry
  index: number
  viewMode: 'grid' | 'list'
  onDelete: () => void
  onRename: () => void
  onShare: () => void
  onDownloadAll: () => void
  editHref: string
  viewClipsHref: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const statusConfig = {
    completed: { dot: 'bg-blue-500', label: 'Completed', spin: false },
    processing: { dot: 'bg-blue-400', label: 'Processing', spin: true },
    failed: { dot: 'bg-red-500', label: 'Failed', spin: false },
  }
  const sc = statusConfig[entry.status] ?? statusConfig.completed

  const clipCount = entry.clips?.length ?? 0
  const clipLengthLabel = CLIP_LENGTH_LABELS[entry.clipLength] ?? entry.clipLength

  return (
    <div
      className="group animate-[fadeIn_0.4s_ease-out_forwards] rounded-xl border border-zinc-800 bg-zinc-900 transition-all duration-300 hover:scale-[1.02] hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards', opacity: 0 }}
    >
      <div className={`flex overflow-hidden rounded-xl ${viewMode === 'list' ? 'flex-row' : 'flex-col'}`}>
        <div className={`relative overflow-hidden bg-zinc-800 ${viewMode === 'list' ? 'h-24 w-40 shrink-0' : 'aspect-video'}`}>
          {entry.thumbnail ? (
            <img
              src={entry.thumbnail}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg className="h-12 w-12 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
          <div className="absolute left-2 top-2 rounded bg-blue-600/90 px-2 py-0.5 text-xs font-medium text-white">
            {clipCount} clips
          </div>
          <div className={`absolute right-2 top-2 flex items-center gap-1.5 rounded px-2 py-0.5 text-xs ${sc.dot === 'bg-blue-500' ? 'bg-blue-500/90' : sc.dot === 'bg-red-500' ? 'bg-red-500/90' : 'bg-blue-400/90'} text-white`}>
            {sc.spin && <span className="inline-block h-2 w-2 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {!sc.spin && <span className="h-2 w-2 rounded-full bg-white" />}
            {sc.label}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="truncate font-semibold text-white">{entry.videoTitle}</h3>
          <p className="mt-0.5 text-sm text-zinc-500">{formatRelativeTime(entry.createdAt)}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{entry.aspectRatio}</span>
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{clipLengthLabel}</span>
          </div>

          {clipCount > 0 && (
            <div className="mt-2 flex gap-1 overflow-hidden">
              {entry.clips!.slice(0, 5).map((c, i) => (
                <div key={i} className="h-12 w-12 shrink-0 overflow-hidden rounded bg-zinc-800">
                  <video src={c.url} muted className="h-full w-full object-cover" preload="metadata" />
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href={viewClipsHref}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
            >
              View Clips
            </Link>
            <Link
              href={editHref}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:border-blue-500 hover:text-white"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={onDownloadAll}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:border-blue-500 hover:text-white"
            >
              Download All
            </button>
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                aria-label="More"
              >
                ⋮
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => { onRename(); setMenuOpen(false) }}
                      className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => { onShare(); setMenuOpen(false) }}
                      className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800"
                    >
                      Share
                    </button>
                    <button
                      type="button"
                      onClick={() => { onDelete(); setMenuOpen(false) }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-800"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RenameModal({
  entry,
  onSave,
  onCancel,
}: {
  entry: LibraryEntry
  onSave: (title: string) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(entry.videoTitle)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 max-w-md animate-[fadeIn_0.2s_ease-out] rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white">Rename project</h3>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
        />
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(title.trim() || entry.videoTitle)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 max-w-md animate-[fadeIn_0.2s_ease-out] rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white">Delete this project?</h3>
        <p className="mt-2 text-sm text-zinc-400">
          This will remove it from your library but won&apos;t delete the actual clip files.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
