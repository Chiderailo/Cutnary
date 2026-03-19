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
   * Body: { video_url: string }
   * Creates a job, pushes to Redis queue (video_jobs), returns job ID and status
   */
  async store({ request, response }: HttpContext) {
    // Validate URL input - returns 422 if invalid
    const { video_url: videoUrl } = await request.validateUsing(processVideoValidator)

    // Generate unique job ID and store job in memory
    const job = jobService.createJob(videoUrl)

    // Push to Redis queue (video_jobs) with payload:
    // { job_id, video_url, status: "queued" }
    // The Python worker consumes from this queue and receives this payload
    await addVideoProcessingJob(job.id, videoUrl)

    return response.status(202).json({
      success: true,
      job_id: job.id,
      status: job.status,
      message: 'Video processing job queued successfully',
    })
  }
}
