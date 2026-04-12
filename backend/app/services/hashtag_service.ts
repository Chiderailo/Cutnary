/*
|--------------------------------------------------------------------------
| Hashtag Service
|--------------------------------------------------------------------------
| Platform-specific hashtag generation using Gemini.
*/

import { GoogleGenerativeAI } from '@google/generative-ai'
import env from '#start/env'

const PLATFORM_PROMPTS: Record<string, string> = {
  tiktok:
    'Focus on #fyp #foryou #viral and trending TikTok hashtags. Short, punchy, discovery-focused.',
  instagram:
    'Mix of niche and broad Instagram hashtags. Include popular Reels hashtags like #reels #explore.',
  youtube:
    'Keyword-focused hashtags for YouTube search. Include #shorts and topic-relevant terms.',
  facebook:
    'Fewer, more specific hashtags. Facebook prefers 3-5 relevant hashtags over many.',
}

const PLATFORM_LIMITS: Record<string, number> = {
  tiktok: 8,
  instagram: 15,
  youtube: 10,
  facebook: 5,
}

export async function generateHashtags(content: string, platform: string): Promise<string[]> {
  const apiKey = env.get('GOOGLE_API_KEY')
  if (!apiKey) {
    return getDefaultHashtags(platform)
  }

  const limit = PLATFORM_LIMITS[platform] ?? 10
  const promptHint = PLATFORM_PROMPTS[platform] ?? ''

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `Generate ${limit} viral hashtags for this ${platform} video content.
Content: ${content.slice(0, 400)}

${promptHint}

Return ONLY a JSON array of hashtag strings without the # symbol.
Example: ["viral", "trending", "fyp"]
No other text.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()?.trim() ?? ''

    let parsed: string[] = []
    if (text.includes('[')) {
      const jsonMatch = text.match(/\[[\s\S]*?\]/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]) as string[]
      }
    }

    return Array.isArray(parsed)
      ? parsed.filter((h) => typeof h === 'string').map((h) => String(h).replace(/^#/, ''))
      : getDefaultHashtags(platform)
  } catch {
    return getDefaultHashtags(platform)
  }
}

function getDefaultHashtags(platform: string): string[] {
  const defaults: Record<string, string[]> = {
    tiktok: ['viral', 'fyp', 'foryou', 'trending', 'reels'],
    instagram: ['viral', 'reels', 'trending', 'explore', 'fyp'],
    youtube: ['shorts', 'viral', 'trending', 'subscribe'],
    facebook: ['viral', 'reels', 'trending'],
  }
  return defaults[platform] ?? ['viral', 'trending', 'reels']
}
