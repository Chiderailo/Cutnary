/**
 * Library storage utilities - cutnary_library in localStorage
 */

export interface LibraryClip {
  url: string
  score?: number
  description?: string
  duration?: number
  startTime?: number
  endTime?: number
  viralDescription?: string
  thumbnailUrl?: string
  id?: string
}

export interface LibraryEntry {
  id: string
  type?: 'clips' | 'transcript'
  videoUrl: string
  videoTitle: string
  thumbnail: string
  createdAt: string
  status: 'processing' | 'completed' | 'failed'
  aspectRatio?: string
  clipLength?: string
  clips?: LibraryClip[]
  language?: string
  speakerSeparation?: boolean
  speakerCount?: number
}

const STORAGE_KEY = 'cutnary_library'

/** Extract YouTube video ID from any supported URL format */
export function getYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0].split('?')[0] || null
      return u.searchParams.get('v')
    }
  } catch {}
  const match = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)
  return match ? match[1] : null
}

export function getYouTubeThumbnail(url: string): string {
  const id = getYouTubeVideoId(url)
  if (id) return `https://img.youtube.com/vi/${id}/mqdefault.jpg`
  return ''
}

export function getLibrary(): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function saveLibrary(entries: LibraryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {}
}

export function addToLibrary(entry: LibraryEntry): void {
  const jobId = entry.id
  const clips = entry.clips ?? []
  console.log('addToLibrary called with jobId:', jobId)
  console.log('clips count:', clips.length)
  console.log('clip ids:', clips.map((c) => c.id))

  const lib = getLibrary()
  const alreadyExists = lib.some((e) => e.id === entry.id)
  if (alreadyExists) return
  lib.unshift(entry)
  saveLibrary(lib)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cutnary-library-updated'))
  }
}

export function removeFromLibrary(id: string): void {
  const lib = getLibrary().filter((e) => e.id !== id)
  saveLibrary(lib)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cutnary-library-updated'))
  }
}

/**
 * Remove one clip from a library entry by index.
 * If that was the last clip, the whole entry (group) is removed.
 */
export function removeClipFromLibrary(entryId: string, clipIndex: number): void {
  const lib = getLibrary()
  const idx = lib.findIndex((e) => e.id === entryId)
  if (idx < 0) return
  const entry = lib[idx]
  const clips = entry.clips
  if (!clips || clipIndex < 0 || clipIndex >= clips.length) return

  const nextClips = clips.filter((_, i) => i !== clipIndex)
  if (nextClips.length === 0) {
    lib.splice(idx, 1)
  } else {
    lib[idx] = { ...entry, clips: nextClips }
  }
  saveLibrary(lib)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cutnary-library-updated'))
  }
}

export function updateLibraryEntry(id: string, updates: Partial<LibraryEntry>): void {
  const lib = getLibrary()
  const idx = lib.findIndex((e) => e.id === id)
  if (idx >= 0) lib[idx] = { ...lib[idx], ...updates }
  saveLibrary(lib)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cutnary-library-updated'))
  }
}
