/*
|--------------------------------------------------------------------------
| Job Complete Validator
|--------------------------------------------------------------------------
|
| Validates the request body when the Python AI worker reports job completion.
| Internal endpoint - in production, add authentication.
|
*/

import vine from '@vinejs/vine'

const clipSchema = vine.object({
  id: vine.string().optional(),
  url: vine.string(),
  start_time: vine.number().optional(),
  end_time: vine.number().optional(),
  description: vine.string().optional(),
})

export const jobCompleteValidator = vine.compile(
  vine.object({
    status: vine.enum(['completed', 'failed']),
    error: vine.string().optional(),
    clips: vine.array(clipSchema).optional(),
  })
)
