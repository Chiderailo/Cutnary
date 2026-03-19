/*
|--------------------------------------------------------------------------
| Job Status Validator
|--------------------------------------------------------------------------
|
| Validates POST /api/job/:id/status - worker reports progress.
|
*/

import vine from '@vinejs/vine'

const validStatuses = [
  'queued',
  'downloading',
  'transcribing',
  'detecting_clips',
  'generating_clips',
  'adding_subtitles',
  'completed',
  'failed',
] as const

export const jobStatusValidator = vine.compile(
  vine.object({
    status: vine.enum(validStatuses),
    error: vine.string().optional(),
  })
)
