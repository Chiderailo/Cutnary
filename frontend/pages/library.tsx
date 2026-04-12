/**
 * Library Page - My videos and clips (WayinVideo/Opus Clip style)
 * Dark theme, black/white + blue accents, grid of video cards
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import {
  getLibrary,
  removeFromLibrary,
  updateLibraryEntry,
  type LibraryEntry,
} from '@/lib/library'
import Header from '@/components/Header'
import PostCampaignModal from '@/components/PostCampaignModal'

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
  const [deleteType, setDeleteType] = useState<'clips' | 'transcript' | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [postCampaignOpen, setPostCampaignOpen] = useState(false)

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

  const handleDeleteProject = (id: string) => {
    removeFromLibrary(id)
    setEntries(getLibrary())
    setDeleteId(null)
    setDeleteType(null)
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

  const handleDeleteEntry = (entryId: string) => {
    if (!confirm('Delete this clip collection? This cannot be undone.')) return

    const existing = JSON.parse(localStorage.getItem('cutnary_library') || '[]')
    const filtered = existing.filter((e: LibraryEntry) => e.id !== entryId) as LibraryEntry[]

    localStorage.setItem('cutnary_library', JSON.stringify(filtered))
    setEntries(filtered)
    setDeleteId(null)
    setDeleteType(null)
  }

  const firstClipUrl = (entry: LibraryEntry) =>
    entry.type === 'transcript'
      ? `/transcript/${entry.id}`
      : entry.clips?.[0]?.url
        ? `/editor/${String(entry.id)}?clip=${encodeURIComponent(clipFilename(entry.clips[0].url))}`
        : '#'

  /** Opens dashboard with all clips for this job (same behavior as legacy /?job= on the home page). */
  const viewHref = (entry: LibraryEntry) =>
    entry.type === 'transcript' ? `/transcript/${entry.id}` : `/dashboard?job=${String(entry.id)}#clips`

  return (
    <>
      <Head>
        <title>My Library – Cutnary</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-[#060607] text-zinc-100">
        <Header />
        
        {/* Ambient Glows */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full" />
        </div>

        <main className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">My Library</h1>
              <p className="mt-3 text-lg text-zinc-400">Access and manage all your AI-generated clips and transcripts.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setPostCampaignOpen(true)}
                className="flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 font-bold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 hover:scale-105 active:scale-95"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Post Clips
              </button>
            </div>
          </div>

          <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-zinc-800/50 bg-zinc-900/40 p-4 backdrop-blur-md sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <input
                type="search"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-12 py-3 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
              />
              <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-300 focus:border-violet-500 focus:outline-none"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="most_clips">Most clips</option>
              </select>
              
              <div className="flex rounded-2xl border border-zinc-800 bg-zinc-900 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-white shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-white shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[32px] border border-zinc-800 bg-zinc-900/40 py-32 text-center backdrop-blur-md">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-violet-600/10 text-4xl">
                🎬
              </div>
              <h2 className="text-2xl font-bold text-white">Your library is empty</h2>
              <p className="mt-2 text-zinc-500 max-w-sm">
                Paste a YouTube link on the dashboard to start generating viral clips with AI.
              </p>
              <Link
                href="/dashboard"
                className="mt-8 rounded-2xl bg-white px-8 py-3.5 font-bold text-black transition-all hover:bg-zinc-200 active:scale-95"
              >
                Create your first clip
              </Link>
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-xl text-zinc-500">No projects match your search.</p>
              <button onClick={() => setSearch('')} className="mt-4 text-violet-400 hover:underline font-medium">Clear search</button>
            </div>
          ) : (
            <div
              className={`grid gap-6 transition-all duration-500 ${
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
                  onDelete={() => handleDeleteEntry(entry.id)}
                  onRename={() => setRenameId(entry.id)}
                  onShare={() => {
                    const base = typeof window !== 'undefined' ? window.location.origin : ''
                    navigator.clipboard.writeText(
                      entry.type === 'transcript'
                        ? `${base}/transcript/${entry.id}`
                        : `${base}/dashboard?job=${String(entry.id)}#clips`
                    )
                  }}
                  onDownloadAll={() => handleDownloadAll(entry)}
                  editHref={firstClipUrl(entry)}
                  viewHref={viewHref(entry)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {deleteId && (
        <DeleteModal
          title={deleteType === 'transcript' ? 'Delete transcript?' : 'Delete clip group?'}
          body={
            deleteType === 'transcript'
              ? 'This removes the transcript project from your library. It does not delete files on the server.'
              : 'This removes the whole clip group from your library. It does not delete files on the server.'
          }
          onConfirm={() => handleDeleteProject(deleteId)}
          onCancel={() => {
            setDeleteId(null)
            setDeleteType(null)
          }}
        />
      )}

      {postCampaignOpen && (
        <PostCampaignModal onClose={() => setPostCampaignOpen(false)} />
      )}
    </>
  )
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'EN', es: 'ES', fr: 'FR', de: 'DE', it: 'IT', pt: 'PT',
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
  viewHref,
}: {
  entry: LibraryEntry
  index: number
  viewMode: 'grid' | 'list'
  onDelete: () => void
  onRename: () => void
  onShare: () => void
  onDownloadAll: () => void
  editHref: string
  viewHref: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const isTranscript = entry.type === 'transcript'
  const clipCount = entry.clips?.length ?? 0
  const clipLengthLabel = entry.clipLength ? (CLIP_LENGTH_LABELS[entry.clipLength] ?? entry.clipLength) : ''

  const statusConfig = {
    completed: { dot: 'bg-blue-500', label: 'Completed', spin: false },
    processing: { dot: 'bg-amber-500', label: 'Processing', spin: true },
    failed: { dot: 'bg-red-500', label: 'Failed', spin: false },
  }
  const sc = statusConfig[entry.status] ?? statusConfig.completed

  const typeBadge =
    entry.status === 'processing'
      ? { bg: 'bg-amber-500/90', label: 'Processing', spin: true }
      : isTranscript
        ? { bg: 'bg-blue-600/90', label: 'Transcript', spin: false }
        : { bg: 'bg-violet-600/90', label: 'AI Clips', spin: false }

  return (
    <div
      className="group relative animate-[fadeIn_0.5s_ease-out_forwards] overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-900/40 transition-all duration-300 hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-500/10 backdrop-blur-md"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards', opacity: 0 }}
    >
      <div className={`flex flex-col h-full ${viewMode === 'list' ? 'sm:flex-row' : ''}`}>
        <div className={`relative overflow-hidden bg-zinc-800 transition-transform duration-500 group-hover:scale-[1.02] ${viewMode === 'list' ? 'sm:h-auto sm:w-64 shrink-0' : 'aspect-video'}`}>
          {entry.thumbnail ? (
            <img
              src={entry.thumbnail}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
              <svg className="h-12 w-12 text-zinc-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
          
          <div className="absolute left-3 top-3 flex flex-col gap-2">
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur-md ${typeBadge.bg}`}>
              {typeBadge.spin && <span className="inline-block h-2 w-2 animate-spin rounded-full border border-white border-t-transparent" />}
              {typeBadge.label}
            </div>
            {entry.status === 'completed' && !isTranscript && (
              <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur-md">
                🔥 {clipCount} clips
              </div>
            )}
          </div>

          <div className="absolute right-3 top-3">
             <div className={`flex items-center justify-center h-6 w-6 rounded-full shadow-lg backdrop-blur-md ${sc.dot} border-2 border-white/20`}>
                {sc.spin && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
             </div>
          </div>

          {/* Overlay Play Button on Hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
             <Link href={viewHref} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-xl transition-transform duration-300 hover:scale-110">
                <svg className="h-6 w-6 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
             </Link>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-white group-hover:text-violet-400 transition-colors">{entry.videoTitle}</h3>
              <p className="mt-1 text-xs font-medium text-zinc-500 uppercase tracking-widest">{formatRelativeTime(entry.createdAt)}</p>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-500 transition-all hover:bg-zinc-800 hover:text-white"
                aria-label="More"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
                  <div className="absolute right-0 top-full z-20 mt-2 min-w-[180px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl backdrop-blur-xl">
                    <button
                      type="button"
                      onClick={() => { onRename(); setMenuOpen(false) }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                    >
                      <span>✏️</span> Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => { onShare(); setMenuOpen(false) }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                    >
                      <span>🔗</span> Copy Link
                    </button>
                    <div className="my-1 border-t border-zinc-800" />
                    <button
                      type="button"
                      onClick={() => { onDelete(); setMenuOpen(false) }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      <span>🗑️</span> Delete Project
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {entry.language && (
              <span className="rounded-lg bg-zinc-800/50 px-2.5 py-1 text-[10px] font-bold text-zinc-400 border border-zinc-700/30">
                {LANGUAGE_LABELS[entry.language] ?? entry.language.toUpperCase()}
              </span>
            )}
            {entry.aspectRatio && (
              <span className="rounded-lg bg-zinc-800/50 px-2.5 py-1 text-[10px] font-bold text-zinc-400 border border-zinc-700/30">{entry.aspectRatio}</span>
            )}
            {clipLengthLabel && (
              <span className="rounded-lg bg-zinc-800/50 px-2.5 py-1 text-[10px] font-bold text-zinc-400 border border-zinc-700/30">{clipLengthLabel}</span>
            )}
          </div>

          <div className="mt-auto pt-6 flex flex-wrap items-center gap-3">
            <Link
              href={viewHref}
              className="flex-1 rounded-xl bg-violet-600 px-4 py-2 text-center text-sm font-bold text-white transition-all hover:bg-violet-500 active:scale-95"
            >
              {isTranscript ? 'Transcript' : 'View Clips'}
            </Link>
            {!isTranscript && entry.status === 'completed' && (
              <>
                <Link
                  href={editHref}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 transition-all hover:border-violet-500 hover:text-white"
                  title="Edit Clips"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={onDownloadAll}
                  className="rounded-xl border border-zinc-700 p-2 text-zinc-400 transition-all hover:border-violet-500 hover:text-white"
                  title="Download All"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </>
            )}
            {entry.status === 'failed' && (
               <button
                  onClick={onDelete}
                  className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-400 transition-all hover:bg-red-500/20"
               >
                  Retry / Delete
               </button>
            )}
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

function DeleteModal({
  title,
  body,
  onConfirm,
  onCancel,
}: {
  title: string
  body: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 max-w-md animate-[fadeIn_0.2s_ease-out] rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-zinc-400">{body}</p>
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
