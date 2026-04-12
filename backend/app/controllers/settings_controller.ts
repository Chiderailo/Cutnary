/*
|--------------------------------------------------------------------------
| Settings Controller
|--------------------------------------------------------------------------
| Social media API credentials per user.
*/

import type { HttpContext } from '@adonisjs/core/http'
import SocialCredential from '#models/social_credential'

const PLATFORMS = ['youtube', 'tiktok', 'instagram', 'facebook', 'meta'] as const

export default class SettingsController {
  /**
   * GET /api/settings/social-credentials
   * Returns which platforms have credentials configured (never the actual secrets).
   */
  async getCredentials({ response, auth }: HttpContext) {
    auth.getUserOrFail()
    const creds = await SocialCredential.query().where('user_id', auth.user!.id)
    const metaConfigured = creds.some((c) => c.platform === 'meta')
    const result: Record<string, boolean> = {
      youtube: creds.some((c) => c.platform === 'youtube'),
      tiktok: creds.some((c) => c.platform === 'tiktok'),
      instagram: metaConfigured,
      facebook: metaConfigured,
    }
    return response.json({ success: true, credentials: result })
  }

  /**
   * POST /api/settings/social-credentials
   * Save encrypted credentials for a platform.
   */
  async saveCredentials({ request, response, auth }: HttpContext) {
    auth.getUserOrFail()
    const body = request.body() as {
      platform?: string
      client_id?: string
      client_secret?: string
      client_key?: string
      app_id?: string
      app_secret?: string
    }
    const platform = (body.platform ?? '').toLowerCase()
    if (!['youtube', 'tiktok', 'instagram', 'facebook'].includes(platform)) {
      return response.status(400).json({ success: false, error: 'Invalid platform' })
    }
    const clientId =
      body.client_id ?? body.client_key ?? body.app_id ?? ''
    const clientSecret =
      body.client_secret ?? body.app_secret ?? ''
    if (!clientId.trim() || !clientSecret.trim()) {
      return response.status(400).json({ success: false, error: 'client_id and client_secret required' })
    }
    const dbPlatform = ['instagram', 'facebook'].includes(platform) ? 'meta' : platform
    const existing = await SocialCredential.query()
      .where('user_id', auth.user!.id)
      .where('platform', dbPlatform)
      .first()
    if (existing) {
      existing.clientId = clientId.trim()
      existing.clientSecret = clientSecret.trim()
      await existing.save()
    } else {
      await SocialCredential.create({
        userId: auth.user!.id,
        platform: dbPlatform,
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      })
    }
    return response.json({ success: true })
  }

  /**
   * DELETE /api/settings/social-credentials/:platform
   * Remove saved credentials for a platform.
   */
  async deleteCredentials({ params, response, auth }: HttpContext) {
    auth.getUserOrFail()
    const platform = (params.platform ?? '').toLowerCase()
    if (!['youtube', 'tiktok', 'instagram', 'facebook'].includes(platform)) {
      return response.status(400).json({ success: false, error: 'Invalid platform' })
    }
    const dbPlatform = ['instagram', 'facebook'].includes(platform) ? 'meta' : platform
    await SocialCredential.query()
      .where('user_id', auth.user!.id)
      .where('platform', dbPlatform)
      .delete()
    return response.json({ success: true })
  }
}
