/*
|--------------------------------------------------------------------------
| User Controller
|--------------------------------------------------------------------------
| Profile, password, preferences, delete account
*/

import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'

export default class UserController {
  /**
   * PATCH /api/user/profile
   * Update display name and profile picture. Never allow email changes.
   */
  async updateProfile({ request, response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const body = request.body() as { name?: string; profile_picture_url?: string }
    const name = typeof body.name === 'string' ? body.name.trim() : undefined
    const profilePictureUrl =
      typeof body.profile_picture_url === 'string' ? body.profile_picture_url.trim() || null : undefined

    if (name !== undefined) {
      user.fullName = name || null
    }
    if (profilePictureUrl !== undefined) {
      user.profilePictureUrl = profilePictureUrl
    }
    await user.save()
    return response.json({ success: true, user: { fullName: user.fullName, profilePictureUrl: user.profilePictureUrl } })
  }

  /**
   * PATCH /api/user/password
   * Change password. Only for non-OAuth (credentials) users.
   */
  async updatePassword({ request, response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.authProvider === 'google' || !user.password) {
      return response.status(400).json({
        success: false,
        error: 'Password is managed by Google. Use Google to sign in.',
      })
    }
    const body = request.body() as { current_password?: string; new_password?: string }
    const currentPassword = body.current_password
    const newPassword = body.new_password
    if (!currentPassword || !newPassword) {
      return response.status(400).json({
        success: false,
        error: 'current_password and new_password required',
      })
    }
    if (newPassword.length < 8) {
      return response.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters',
      })
    }
    const isValid = await hash.verify(user.password!, currentPassword)
    if (!isValid) {
      return response.status(400).json({
        success: false,
        error: 'Current password is incorrect',
      })
    }
    user.password = newPassword
    await user.save()
    return response.json({ success: true })
  }

  /**
   * GET /api/user/preferences
   */
  async getPreferences({ response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    return response.json({
      success: true,
      preferences: {
        default_aspect_ratio: user.defaultAspectRatio ?? '9:16',
        default_clip_length: user.defaultClipLength ?? 'auto',
        default_language: user.defaultLanguage ?? 'en',
      },
    })
  }

  /**
   * PATCH /api/user/preferences
   */
  async updatePreferences({ request, response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const body = request.body() as {
      default_aspect_ratio?: string
      default_clip_length?: string
      default_language?: string
    }
    const validAspectRatios = ['9:16', '16:9', '1:1', '4:5']
    const validClipLengths = ['auto', '30s', '60s', '90s']
    const validLanguages = ['en', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'zh']

    if (body.default_aspect_ratio !== undefined) {
      user.defaultAspectRatio = validAspectRatios.includes(body.default_aspect_ratio)
        ? body.default_aspect_ratio
        : '9:16'
    }
    if (body.default_clip_length !== undefined) {
      user.defaultClipLength = validClipLengths.includes(body.default_clip_length)
        ? body.default_clip_length
        : 'auto'
    }
    if (body.default_language !== undefined) {
      user.defaultLanguage = validLanguages.includes(body.default_language) ? body.default_language : 'en'
    }
    await user.save()
    return response.json({
      success: true,
      preferences: {
        default_aspect_ratio: user.defaultAspectRatio,
        default_clip_length: user.defaultClipLength,
        default_language: user.defaultLanguage,
      },
    })
  }

  /**
   * DELETE /api/user
   * Delete account. Requires confirmation on frontend.
   */
  async destroy({ response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.delete()
    return response.json({ success: true })
  }
}
