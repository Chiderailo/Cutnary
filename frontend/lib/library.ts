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
  id?: string
}

export interface LibraryEntry {
  id: string
  videoUrl: string
  videoTitle: string
  thumbnail: string
  createdAt: string
  status: 'processing' | 'completed' | 'failed'
  aspectRatio: string
  clipLength: string
  clips: LibraryClip[]
}

const STORAGE_KEY = 'cutnary_library'

export function getYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0] || null
      return u.searchParams.get('v')
    }
  } catch {}
  return null
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
  const lib = getLibrary()
  const idx = lib.findIndex((e) => e.id === entry.id)
  if (idx >= 0) lib[idx] = entry
  else lib.unshift(entry)
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

export function updateLibraryEntry(id: string, updates: Partial<LibraryEntry>): void {
  const lib = getLibrary()
  const idx = lib.findIndex((e) => e.id === id)
  if (idx >= 0) lib[idx] = { ...lib[idx], ...updates }
  saveLibrary(lib)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cutnary-library-updated'))
  }
}
