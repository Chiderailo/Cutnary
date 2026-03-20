/*
|--------------------------------------------------------------------------
| Process Video Controller
|--------------------------------------------------------------------------
|
| Handles POST /api/process-video - submits a video for AI processing.
| Validates the video URL, creates a job, stores it in memory, and pushes
| the job to the Redis queue (video_jobs) for the Python AI worker to consume.
|
| Queue flow:
| 1. Request comes in with video_url
| 2. We create a job in memory and get a job_id
| 3. We push to Redis queue with payload: { job_id, video_url, status: "queued" }
| 4. Python worker picks up the job from the queue and processes the video
| 5. Worker reports completion via POST /api/job/:id/complete
|
*/

import type { HttpContext } from '@adonisjs/core/http'
import { jobService } from '#services/job_service'
import { addVideoProcessingJob } from '#queue'
import { processVideoValidator } from '#validators/process_video'

export default class ProcessVideoController {
  /**
   * POST /api/process-video
   * Body: { video_url, aspect_ratio?, clip_length?, caption_style? }
   * Creates a job, pushes to Redis queue (video_jobs), returns job ID and status
   */
  async store({ request, response, auth }: HttpContext) {
    const payload = await request.validateUsing(processVideoValidator)
    const { video_url: videoUrl, aspect_ratio, clip_length, caption_style, language } = payload

    const user = auth.getUserOrFail()
    const settings = {
      aspect_ratio: aspect_ratio ?? '9:16',
      clip_length: clip_length ?? 'auto',
      caption_style: caption_style ?? 'simple',
      language: language ?? 'en',
    }
    console.log('Process video: settings=', settings)

    const job = await jobService.createJob(videoUrl, settings, user.id)

    try {
      await addVideoProcessingJob(job.id, videoUrl, settings)
      console.log('Job queued:', job.id, 'settings=', settings)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Queue error'
      const isRedis = /redis|ECONNREFUSED|connect/i.test(msg)
      return response.status(isRedis ? 503 : 500).json({
        success: false,
        error: isRedis
          ? 'Queue unavailable. Is Redis running? Start it with: redis-server'
          : msg,
      })
    }

    return response.status(202).json({
      success: true,
      job_id: job.id,
      status: job.status, // "queued"
      message: 'Video processing job queued successfully',
    })
  }
}
