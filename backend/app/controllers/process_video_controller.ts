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
  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(processVideoValidator)
    const { video_url: videoUrl, aspect_ratio, clip_length, caption_style } = payload

    const settings =
      aspect_ratio || clip_length || caption_style
        ? { aspect_ratio, clip_length, caption_style }
        : undefined

    // Generate unique job ID and store job in memory
    const job = jobService.createJob(videoUrl, settings)

    // Push to Redis queue (video_jobs) with payload for the Python worker
    await addVideoProcessingJob(job.id, videoUrl, settings)

    return response.status(202).json({
      success: true,
      job_id: job.id,
      status: job.status, // "queued"
      message: 'Video processing job queued successfully',
    })
  }
}
