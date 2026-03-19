/*
|--------------------------------------------------------------------------
| Process Video Validator
|--------------------------------------------------------------------------
|
| Validates the request body for POST /api/process-video
| Ensures video_url is a valid URL string.
|
*/

import vine from '@vinejs/vine'

/**
 * Validator for process-video endpoint
 * Body: { video_url: string }
 */
export const processVideoValidator = vine.compile(
  vine.object({
    video_url: vine.string().url(),
  })
)
