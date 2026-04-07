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
import ExplainerController from '#controllers/explainer_controller'
import HashtagsController from '#controllers/hashtags_controller'
import JobController from '#controllers/job_controller'
import NotificationsController from '#controllers/notifications_controller'
import SettingsController from '#controllers/settings_controller'
import SocialController from '#controllers/social_controller'
import SocialOAuthController from '#controllers/social_oauth_controller'
import NewAccountController from '#controllers/new_account_controller'
import ProcessVideoController from '#controllers/process_video_controller'
import ProfileController from '#controllers/profile_controller'
import UserController from '#controllers/user_controller'
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

      // User profile & preferences
      router.patch('user/profile', [UserController, 'updateProfile']).use(auth)
      router.patch('user/password', [UserController, 'updatePassword']).use(auth)
      router.get('user/preferences', [UserController, 'getPreferences']).use(auth)
      router.patch('user/preferences', [UserController, 'updatePreferences']).use(auth)
      router.delete('user', [UserController, 'destroy']).use(auth)

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

      // Protected: explainer
      router.post('explainer', [ExplainerController, 'create']).use(auth)
      router.get('explainer/:jobId', [ExplainerController, 'show']).use(auth)

      // Worker callback (no auth)
      router.post('explainer/:jobId/complete', [ExplainerController, 'complete'])

      // Settings
      router.get('settings/social-credentials', [SettingsController, 'getCredentials']).use(auth)
      router.post('settings/social-credentials', [SettingsController, 'saveCredentials']).use(auth)
      router.delete('settings/social-credentials/:platform', [SettingsController, 'deleteCredentials']).use(auth)

      // Protected: social
      router.post('social/connect', [SocialController, 'connect']).use(auth)
      router.get('social/accounts', [SocialController, 'accounts']).use(auth)
      router.delete('social/accounts/:id', [SocialController, 'disconnectAccount']).use(auth)
      router.post('social/post', [SocialController, 'post']).use(auth)
      router.post('social/campaign', [SocialController, 'campaign']).use(auth)
      router.get('social/post/:id/status', [SocialController, 'postStatus']).use(auth)
      router.post('social/post/:id/retry', [SocialController, 'retryPost']).use(auth)
      router.get('social/posts', [SocialController, 'posts']).use(auth)
      router.get('social/scheduled', [SocialController, 'scheduled']).use(auth)
      router.post('social/process-scheduled', [SocialController, 'processScheduled']).use(auth)
      router.get('social/facebook/pending-pages', [SocialController, 'facebookPendingPages']).use(auth)
      router.post('social/facebook/select-page', [SocialController, 'facebookSelectPage']).use(auth)

      // Hashtags
      router.post('hashtags/generate', [HashtagsController, 'generate']).use(auth)

      // Notifications
      router.get('notifications', [NotificationsController, 'index']).use(auth)
      router.post('notifications/:id/read', [NotificationsController, 'markRead']).use(auth)

      // OAuth callbacks (no auth - redirect after platform auth)
      router.get('social/oauth/youtube/callback', [SocialOAuthController, 'youtubeCallback'])
      router.get('social/oauth/tiktok/callback', [SocialOAuthController, 'tiktokCallback'])
      router.get('social/oauth/instagram/callback', [SocialOAuthController, 'instagramCallback'])
      router.get('social/oauth/facebook/callback', [SocialOAuthController, 'facebookCallback'])
    })
    .prefix('/api')
}
