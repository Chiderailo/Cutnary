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
   * Returns array of clips for the given job. Requires auth, owner only.
   */
  async index({ params, response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const job = await jobService.getJob(params.jobId, user.id)

    if (!job) {
      return response.status(404).json({
        success: false,
        error: 'Job not found',
        job_id: params.jobId,
        clips: [],
      })
    }

    const clips = await jobService.getClipsByJobId(params.jobId)
    return response.json({
      success: true,
      job_id: params.jobId,
      status: job.status,
      clips,
    })
  }
}
