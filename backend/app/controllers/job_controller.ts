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
import { basename } from 'node:path'
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { jobService } from '#services/job_service'
import { jobCompleteValidator } from '#validators/job_complete'
import { jobStatusValidator } from '#validators/job_status'
import type { ClipData } from '#services/job_service'

const getBaseUrl = () => (env.get('APP_URL') ?? 'http://localhost:3333').replace(/\/$/, '')

export default class JobController {
  /**
   * GET /api/job/:id
   * Returns job status, metadata, and clips (if completed). Requires auth, owner only.
   */
  async show({ params, response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const job = await jobService.getJob(params.id, user.id)

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
   * POST /api/job/:id/status
   * Worker reports progress at each pipeline step (no auth - worker callback)
   */
  async updateStatus({ params, request, response }: HttpContext) {
    const { status, error } = await request.validateUsing(jobStatusValidator)
    const job = await jobService.getJobForWorker(params.id)

    if (!job) {
      return response.status(404).json({
        success: false,
        error: 'Job not found',
        job_id: params.id,
      })
    }

    await jobService.updateJobStatus(params.id, status, { error })

    return response.json({
      success: true,
      job_id: params.id,
      status,
    })
  }

  /**
   * POST /api/job/:id/complete
   * Called by Python AI worker to report job completion (no auth - worker callback)
   */
  async complete({ params, request, response }: HttpContext) {
    const payload = await request.validateUsing(jobCompleteValidator)
    const job = await jobService.getJobForWorker(params.id)

    if (!job) {
      return response.status(404).json({
        success: false,
        error: 'Job not found',
        job_id: params.id,
      })
    }

    const clips: ClipData[] | undefined = payload.clips?.map((c) => {
      let rawScore = (c as { score?: number | string }).score
      if (typeof rawScore === 'string') {
        try {
          const parsed = JSON.parse(rawScore) as { score?: number }
          rawScore = typeof parsed === 'object' && parsed != null && 'score' in parsed ? parsed.score : rawScore
        } catch {
          rawScore = parseFloat(String(rawScore))
        }
      }
      const score =
        typeof rawScore === 'number'
          ? rawScore
          : typeof rawScore === 'string'
            ? parseFloat(String(rawScore))
            : undefined
      const clipUrl = c.url
      const urlStr = String(clipUrl || '').replace(/\\/g, '/')
      const fullUrl = urlStr.startsWith('http://') || urlStr.startsWith('https://')
        ? clipUrl
        : basename(urlStr)
          ? `${getBaseUrl()}/storage/clips/${basename(urlStr)}`
          : clipUrl
      const clipWords = (c as { words?: Array<{ word: string; start: number; end: number }> }).words
      return {
        id: c.id ?? randomUUID(),
        jobId: params.id,
        url: fullUrl,
        startTime: c.start_time ?? 0,
        endTime: c.end_time ?? 0,
        description: c.description,
        viralDescription: (c as { viral_description?: string }).viral_description,
        score: Number.isFinite(score) ? score : undefined,
        words: Array.isArray(clipWords) ? clipWords : undefined,
      }
    })

    await jobService.updateJobStatus(params.id, payload.status, {
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
