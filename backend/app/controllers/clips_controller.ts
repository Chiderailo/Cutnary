/*
|--------------------------------------------------------------------------
| Clips Controller
|--------------------------------------------------------------------------
|
| Handles GET /api/clips/:jobId - retrieves clips for a completed job.
| Returns empty array if job not found or no clips yet.
|
*/

import type { HttpContext } from '@adonisjs/core/http'
import { jobService } from '#services/job_service'

export default class ClipsController {
  /**
   * GET /api/clips/:jobId
   * Returns array of clips for the given job
   */
  async index({ params, response }: HttpContext) {
    const clips = jobService.getClipsByJobId(params.jobId)

    // Also check if job exists for better UX
    const job = jobService.getJob(params.jobId)

    if (!job) {
      return response.status(404).json({
        success: false,
        error: 'Job not found',
        job_id: params.jobId,
        clips: [],
      })
    }

    return response.json({
      success: true,
      job_id: params.jobId,
      status: job.status,
      clips,
    })
  }
}
