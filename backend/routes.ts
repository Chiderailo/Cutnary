/*
|--------------------------------------------------------------------------
| API Routes Registration
|--------------------------------------------------------------------------
|
| Defines the REST API routes for video processing.
| Imported and invoked from start/routes.ts during application boot.
|
| Routes:
|   POST   /api/process-video  - Submit video for AI processing
|   GET    /api/job/:id        - Get job status and details
|   GET    /api/clips/:jobId   - Get clips for a completed job
|
*/

import router from '@adonisjs/core/services/router'
import ClipsController from '#controllers/clips_controller'
import JobController from '#controllers/job_controller'
import ProcessVideoController from '#controllers/process_video_controller'

/**
 * Register API routes for video processing
 */
export function registerApiRoutes() {
  router
    .group(() => {
      // POST /api/process-video - validate URL, create job, push to Redis queue
      router.post('process-video', [ProcessVideoController, 'store'])

      // GET /api/job/:id - get job status
      router.get('job/:id', [JobController, 'show'])

      // POST /api/job/:id/complete - worker callback (Python AI worker reports completion)
      router.post('job/:id/complete', [JobController, 'complete'])

      // GET /api/clips/:jobId - get clips for a job
      router.get('clips/:jobId', [ClipsController, 'index'])
    })
    .prefix('/api')
}
