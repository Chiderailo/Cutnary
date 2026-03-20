/*
|--------------------------------------------------------------------------
| API Routes Registration
|--------------------------------------------------------------------------
|
| Auth routes (no auth required):
|   POST /api/auth/register, POST /api/auth/login
|
| Auth routes (require auth):
|   POST /api/auth/logout, GET /api/auth/me
|
| Protected routes (require auth): process-video, job/:id (GET), clips, render
| Worker callbacks (no auth): job/:id/status, job/:id/complete, render-complete
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import AccessTokenController from '#controllers/access_token_controller'
import ClipsController from '#controllers/clips_controller'
import JobController from '#controllers/job_controller'
import NewAccountController from '#controllers/new_account_controller'
import ProcessVideoController from '#controllers/process_video_controller'
import ProfileController from '#controllers/profile_controller'
import RenderController from '#controllers/render_controller'
import TranscriptController from '#controllers/transcript_controller'

/**
 * Register API routes
 */
export function registerApiRoutes() {
  const auth = middleware.auth({ guards: ['api'] })

  router
    .group(() => {
      // Auth routes (public)
      router.post('auth/register', [NewAccountController, 'store'])
      router.post('auth/login', [AccessTokenController, 'store'])

      // Auth routes (protected)
      router.post('auth/logout', [AccessTokenController, 'destroy']).use(auth)
      router.get('auth/me', [ProfileController, 'show']).use(auth)

      // Protected: process video
      router.post('process-video', [ProcessVideoController, 'store']).use(auth)

      // Protected: get job
      router.get('job/:id', [JobController, 'show']).use(auth)

      // Worker callbacks (no auth)
      router.post('job/:id/status', [JobController, 'updateStatus'])
      router.post('job/:id/complete', [JobController, 'complete'])

      // Protected: clips
      router.get('clips/:jobId', [ClipsController, 'index']).use(auth)

      // Protected: render
      router.post('job/:jobId/render', [RenderController, 'render']).use(auth)
      router.get('job/:jobId/render-status', [RenderController, 'renderStatus']).use(auth)

      // Worker callback (no auth)
      router.post('job/:jobId/render-complete', [RenderController, 'renderComplete'])

      // Protected: transcript
      router.post('transcript', [TranscriptController, 'store']).use(auth)
      router.get('transcript/:jobId', [TranscriptController, 'show']).use(auth)

      // Worker callbacks (no auth)
      router.post('transcript/:jobId/status', [TranscriptController, 'updateStatus'])
      router.post('transcript/:jobId/complete', [TranscriptController, 'complete'])
    })
    .prefix('/api')
}
