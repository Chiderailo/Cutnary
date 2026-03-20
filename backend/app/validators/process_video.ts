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
 * Body: { video_url, aspect_ratio?, clip_length?, caption_style?, language? }
 */
export const processVideoValidator = vine.compile(
  vine.object({
    video_url: vine.string().url(),
    aspect_ratio: vine.string().optional(),
    clip_length: vine.string().optional(),
    caption_style: vine.string().optional(),
    language: vine.string().optional(),
  })
)
