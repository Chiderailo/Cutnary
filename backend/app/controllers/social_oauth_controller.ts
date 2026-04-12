/*
|--------------------------------------------------------------------------
| Social OAuth Callback Controller
|--------------------------------------------------------------------------
| Handles OAuth callbacks from YouTube, TikTok, Instagram, Facebook.
*/

import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { exchangeCodeForTokens } from '#services/social_service'
import type { Platform } from '#services/social_service'

const FRONTEND_SOCIAL = '/social'
const STATE_TTL_MS = 15 * 60 * 1000

function getFrontendBaseUrl(): string {
  return (env.get('FRONTEND_URL') ?? 'http://localhost:3000').replace(/\/$/, '')
}

export default class SocialOAuthController {
  async youtubeCallback({ request, response }: HttpContext) {
    return this.handleCallback('youtube', request, response)
  }

  async tiktokCallback({ request, response }: HttpContext) {
    return this.handleCallback('tiktok', request, response)
  }

  async instagramCallback({ request, response }: HttpContext) {
    return this.handleCallback('instagram', request, response)
  }

  async facebookCallback({ request, response }: HttpContext) {
    return this.handleCallback('facebook', request, response)
  }

  private async handleCallback(platform: Platform, request: HttpContext['request'], response: HttpContext['response']) {
    const code = request.input('code')
    const state = request.input('state')
    const error = request.input('error')

    const baseUrl = getFrontendBaseUrl()

    if (error) {
      console.error(`[${platform} OAuth] callback error:`, error)
      const mappedError = platform === 'youtube' ? 'youtube_denied' : error
      return response.redirect(`${baseUrl}${FRONTEND_SOCIAL}?error=${encodeURIComponent(mappedError)}`)
    }
    if (!code) {
      return response.redirect(`${baseUrl}${FRONTEND_SOCIAL}?error=no_code`)
    }
    if (!state) {
      return response.redirect(`${baseUrl}${FRONTEND_SOCIAL}?error=invalid_state`)
    }

    let userId: number
    try {
      const normalized = state.replace(/-/g, '+').replace(/_/g, '/')
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
      const decoded = JSON.parse(Buffer.from(padded, 'base64').toString())
      userId = decoded.userId
      const ts = Number(decoded.ts ?? 0)
      if (!userId) throw new Error('Invalid state')
      if (!Number.isFinite(ts) || Date.now() - ts > STATE_TTL_MS) {
        throw new Error('Expired state')
      }
    } catch {
      return response.redirect(`${baseUrl}${FRONTEND_SOCIAL}?error=invalid_state`)
    }

    try {
      const result = await exchangeCodeForTokens(platform, code, userId)
      if ('facebookSelectPage' in result) {
        return response.redirect(
          `${baseUrl}/social/facebook/select-page?pendingId=${result.facebookSelectPage.pendingId}`
        )
      }
      return response.redirect(`${baseUrl}${FRONTEND_SOCIAL}?connected=${platform}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'OAuth failed'
      console.error(`[${platform} OAuth] exchange failed:`, msg)
      return response.redirect(`${baseUrl}${FRONTEND_SOCIAL}?error=${encodeURIComponent(msg)}`)
    }
  }
}
