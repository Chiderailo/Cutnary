/*
|--------------------------------------------------------------------------
| Job Controller
|--------------------------------------------------------------------------
|
| Handles GET /api/job/:id and POST /api/job/:id/complete.
| The complete endpoint is used by the Python AI worker to report results.
|
*/

import { randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import { jobService } from '#services/job_service'
import { jobCompleteValidator } from '#validators/job_complete'
import type { Clip } from '#services/job_service'

export default class JobController {
  /**
   * GET /api/job/:id
   * Returns job status, metadata, and clips (if completed)
   */
  async show({ params, response }: HttpContext) {
    const job = jobService.getJob(params.id)

    if (!job) {
      return response.status(404).json({
        success: false,
        error: 'Job not found',
        job_id: params.id,
      })
    }

    return response.json({
      success: true,
      job: {
        id: job.id,
        video_url: job.videoUrl,
        status: job.status,
        created_at: job.createdAt.toISOString(),
        updated_at: job.updatedAt.toISOString(),
        error: job.error,
        clips: job.clips,
      },
    })
  }

  /**
   * POST /api/job/:id/complete
   * Called by Python AI worker to report job completion or failure
   * Body: { status: 'completed'|'failed', error?: string, clips?: [...] }
   */
  async complete({ params, request, response }: HttpContext) {
    const payload = await request.validateUsing(jobCompleteValidator)
    const job = jobService.getJob(params.id)

    if (!job) {
      return response.status(404).json({
        success: false,
        error: 'Job not found',
        job_id: params.id,
      })
    }

    const clips: Clip[] | undefined = payload.clips?.map((c) => ({
      id: c.id ?? randomUUID(),
      jobId: params.id,
      url: c.url,
      startTime: c.start_time ?? 0,
      endTime: c.end_time ?? 0,
      description: c.description,
    }))

    jobService.updateJobStatus(params.id, payload.status, {
      error: payload.error,
      clips,
    })

    return response.json({
      success: true,
      job_id: params.id,
      status: payload.status,
    })
  }
}
