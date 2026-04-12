/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'storage.serve_clip': {
    methods: ["GET","HEAD"]
    pattern: '/storage/clips/:filename'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { filename: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'storage.serve_video': {
    methods: ["GET","HEAD"]
    pattern: '/storage/videos/:filename'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { filename: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'storage.serve_render': {
    methods: ["GET","HEAD"]
    pattern: '/storage/renders/:filename'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { filename: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'storage.serve_thumbnail': {
    methods: ["GET","HEAD"]
    pattern: '/storage/thumbnails/:filename'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { filename: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'storage.serve_explainer': {
    methods: ["GET","HEAD"]
    pattern: '/storage/explainers/:filename'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { filename: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'new_account.store': {
    methods: ["POST"]
    pattern: '/api/auth/register'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'access_token.store': {
    methods: ["POST"]
    pattern: '/api/auth/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'google_auth.redirect': {
    methods: ["GET","HEAD"]
    pattern: '/api/auth/google'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'google_auth.callback': {
    methods: ["GET","HEAD"]
    pattern: '/api/auth/google/callback'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'auth_verification.verify_email': {
    methods: ["GET","HEAD"]
    pattern: '/api/auth/verify-email'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'auth_verification.resend_verification': {
    methods: ["POST"]
    pattern: '/api/auth/resend-verification'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'auth_verification.status': {
    methods: ["GET","HEAD"]
    pattern: '/api/auth/verification-status'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'access_token.destroy': {
    methods: ["POST"]
    pattern: '/api/auth/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/auth/me'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'user.update_profile': {
    methods: ["PATCH"]
    pattern: '/api/user/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'user.update_password': {
    methods: ["PATCH"]
    pattern: '/api/user/password'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'user.get_preferences': {
    methods: ["GET","HEAD"]
    pattern: '/api/user/preferences'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'user.update_preferences': {
    methods: ["PATCH"]
    pattern: '/api/user/preferences'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'user.destroy': {
    methods: ["DELETE"]
    pattern: '/api/user'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'process_video.store': {
    methods: ["POST"]
    pattern: '/api/process-video'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'job.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/job/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'job.update_status': {
    methods: ["POST"]
    pattern: '/api/job/:id/status'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'job.complete': {
    methods: ["POST"]
    pattern: '/api/job/:id/complete'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'clips.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/clips/:jobId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { jobId: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'render.render': {
    methods: ["POST"]
    pattern: '/api/job/:jobId/render'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { jobId: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'render.render_status': {
    methods: ["GET","HEAD"]
    pattern: '/api/job/:jobId/render-status'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { jobId: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'render.render_complete': {
    methods: ["POST"]
    pattern: '/api/job/:jobId/render-complete'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { jobId: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'transcript.store': {
    methods: ["POST"]
    pattern: '/api/transcript'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'transcript.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/transcript/:jobId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { jobId: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'transcript.update_status': {
    methods: ["POST"]
    pattern: '/api/transcript/:jobId/status'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { jobId: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'transcript.complete': {
    methods: ["POST"]
    pattern: '/api/transcript/:jobId/complete'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { jobId: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'explainer.create': {
    methods: ["POST"]
    pattern: '/api/explainer'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'explainer.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/explainer/:jobId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { jobId: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'explainer.complete': {
    methods: ["POST"]
    pattern: '/api/explainer/:jobId/complete'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { jobId: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'settings.get_credentials': {
    methods: ["GET","HEAD"]
    pattern: '/api/settings/social-credentials'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'settings.save_credentials': {
    methods: ["POST"]
    pattern: '/api/settings/social-credentials'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'settings.delete_credentials': {
    methods: ["DELETE"]
    pattern: '/api/settings/social-credentials/:platform'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { platform: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social.connect': {
    methods: ["POST"]
    pattern: '/api/social/connect'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social.platform_status': {
    methods: ["GET","HEAD"]
    pattern: '/api/social/platform-status'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social.accounts': {
    methods: ["GET","HEAD"]
    pattern: '/api/social/accounts'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social.disconnect_account': {
    methods: ["DELETE"]
    pattern: '/api/social/accounts/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social.post': {
    methods: ["POST"]
    pattern: '/api/social/post'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social.campaign': {
    methods: ["POST"]
    pattern: '/api/social/campaign'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social.post_status': {
    methods: ["GET","HEAD"]
    pattern: '/api/social/post/:id/status'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social.retry_post': {
    methods: ["POST"]
    pattern: '/api/social/post/:id/retry'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social.posts': {
    methods: ["GET","HEAD"]
    pattern: '/api/social/posts'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social.scheduled': {
    methods: ["GET","HEAD"]
    pattern: '/api/social/scheduled'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social.process_scheduled': {
    methods: ["POST"]
    pattern: '/api/social/process-scheduled'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social.scheduler_run': {
    methods: ["POST"]
    pattern: '/api/social/scheduler/run'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social.facebook_pending_pages': {
    methods: ["GET","HEAD"]
    pattern: '/api/social/facebook/pending-pages'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social.facebook_select_page': {
    methods: ["POST"]
    pattern: '/api/social/facebook/select-page'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'hashtags.generate': {
    methods: ["POST"]
    pattern: '/api/hashtags/generate'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'notifications.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/notifications'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'notifications.mark_all_read': {
    methods: ["POST"]
    pattern: '/api/notifications/read-all'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'notifications.mark_read': {
    methods: ["POST"]
    pattern: '/api/notifications/:id/read'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social_o_auth.youtube_callback': {
    methods: ["GET","HEAD"]
    pattern: '/api/social/oauth/youtube/callback'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social_o_auth.tiktok_callback': {
    methods: ["GET","HEAD"]
    pattern: '/api/social/oauth/tiktok/callback'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social_o_auth.instagram_callback': {
    methods: ["GET","HEAD"]
    pattern: '/api/social/oauth/instagram/callback'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'social_o_auth.facebook_callback': {
    methods: ["GET","HEAD"]
    pattern: '/api/social/oauth/facebook/callback'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.stats': {
    methods: ["GET","HEAD"]
    pattern: '/api/admin/stats'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.users': {
    methods: ["GET","HEAD"]
    pattern: '/api/admin/users'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.update_role': {
    methods: ["PATCH"]
    pattern: '/api/admin/users/:id/role'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.delete_user': {
    methods: ["DELETE"]
    pattern: '/api/admin/users/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.get_social_credentials': {
    methods: ["GET","HEAD"]
    pattern: '/api/admin/social-credentials'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.save_social_credentials': {
    methods: ["POST"]
    pattern: '/api/admin/social-credentials'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.delete_social_credentials': {
    methods: ["DELETE"]
    pattern: '/api/admin/social-credentials/:platform'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { platform: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.jobs': {
    methods: ["GET","HEAD"]
    pattern: '/api/admin/jobs'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.job_detail': {
    methods: ["GET","HEAD"]
    pattern: '/api/admin/jobs/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.revenue': {
    methods: ["GET","HEAD"]
    pattern: '/api/admin/revenue'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
}
