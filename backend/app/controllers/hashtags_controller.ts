/*
|--------------------------------------------------------------------------
| Hashtags Controller
|--------------------------------------------------------------------------
*/

import type { HttpContext } from '@adonisjs/core/http'
import { generateHashtags } from '#services/hashtag_service'

export default class HashtagsController {
  /**
   * POST /api/hashtags/generate
   * Generate platform-specific hashtags using AI.
   */
  async generate({ request, response, auth }: HttpContext) {
    auth.getUserOrFail()

    const body = request.body() as { content?: string; platform?: string }
    const content = body.content ?? ''
    const platform = body.platform ?? 'tiktok'

    const validPlatforms = ['tiktok', 'instagram', 'youtube', 'facebook']
    if (!validPlatforms.includes(platform)) {
      return response.status(400).json({
        success: false,
        error: 'Invalid platform',
      })
    }

    const hashtags = await generateHashtags(content, platform)

    return response.json({
      success: true,
      hashtags,
    })
  }
}
