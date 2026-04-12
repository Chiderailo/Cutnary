/**
 * HashtagSuggestions - AI-generated hashtag chips, click to add/remove
 */

import { useState } from 'react'
import { apiFetch, parseResponseJson } from '@/lib/api'

const TRENDING_TAGS = new Set(['fyp', 'viral', 'foryou', 'trending', 'reels', 'explore', 'shorts'])
const NICHE_INDICATORS: Record<string, string> = {
  fyp: '🔥',
  viral: '🔥',
  foryou: '🔥',
  trending: '📈',
  reels: '📈',
  explore: '📈',
  shorts: '📈',
}

interface HashtagSuggestionsProps {
  content: string
  platform: string
  selected: string[]
  onToggle: (tag: string) => void
  disabled?: boolean
}

export default function HashtagSuggestions({
  content,
  platform,
  selected,
  onToggle,
  disabled = false,
}: HashtagSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadHashtags = async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/hashtags/generate', {
        method: 'POST',
        body: JSON.stringify({ content: content || 'viral short video', platform }),
      })
      const data = await parseResponseJson<{ success: boolean; hashtags?: string[] }>(res)
      if (data.success && data.hashtags) {
        setSuggestions(data.hashtags)
        setLoaded(true)
      }
    } catch {
      setSuggestions(['viral', 'fyp', 'trending', 'reels', 'foryou', 'explore', 'shorts'])
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }

  const allTags = loaded ? suggestions : ['viral', 'fyp', 'trending', 'reels', 'foryou']
  const displayTags = loaded ? suggestions : allTags

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Hashtags</span>
        <button
          type="button"
          onClick={loadHashtags}
          disabled={disabled || loading}
          className="text-xs font-medium text-violet-400 hover:text-violet-300 disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate more'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {displayTags.map((tag) => {
          const isSelected = selected.includes(tag)
          const indicator = NICHE_INDICATORS[tag]
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              disabled={disabled}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-violet-600 text-white ring-1 ring-violet-500'
                  : 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/40'
              } disabled:opacity-50`}
            >
              {indicator && <span>{indicator}</span>}
              #{tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}
