/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'storage.serve_clip': {
    methods: ["GET","HEAD"],
    pattern: '/storage/clips/:filename',
    tokens: [{"old":"/storage/clips/:filename","type":0,"val":"storage","end":""},{"old":"/storage/clips/:filename","type":0,"val":"clips","end":""},{"old":"/storage/clips/:filename","type":1,"val":"filename","end":""}],
    types: placeholder as Registry['storage.serve_clip']['types'],
  },
  'storage.serve_video': {
    methods: ["GET","HEAD"],
    pattern: '/storage/videos/:filename',
    tokens: [{"old":"/storage/videos/:filename","type":0,"val":"storage","end":""},{"old":"/storage/videos/:filename","type":0,"val":"videos","end":""},{"old":"/storage/videos/:filename","type":1,"val":"filename","end":""}],
    types: placeholder as Registry['storage.serve_video']['types'],
  },
  'storage.serve_render': {
    methods: ["GET","HEAD"],
    pattern: '/storage/renders/:filename',
    tokens: [{"old":"/storage/renders/:filename","type":0,"val":"storage","end":""},{"old":"/storage/renders/:filename","type":0,"val":"renders","end":""},{"old":"/storage/renders/:filename","type":1,"val":"filename","end":""}],
    types: placeholder as Registry['storage.serve_render']['types'],
  },
  'storage.serve_thumbnail': {
    methods: ["GET","HEAD"],
    pattern: '/storage/thumbnails/:filename',
    tokens: [{"old":"/storage/thumbnails/:filename","type":0,"val":"storage","end":""},{"old":"/storage/thumbnails/:filename","type":0,"val":"thumbnails","end":""},{"old":"/storage/thumbnails/:filename","type":1,"val":"filename","end":""}],
    types: placeholder as Registry['storage.serve_thumbnail']['types'],
  },
  'storage.serve_explainer': {
    methods: ["GET","HEAD"],
    pattern: '/storage/explainers/:filename',
    tokens: [{"old":"/storage/explainers/:filename","type":0,"val":"storage","end":""},{"old":"/storage/explainers/:filename","type":0,"val":"explainers","end":""},{"old":"/storage/explainers/:filename","type":1,"val":"filename","end":""}],
    types: placeholder as Registry['storage.serve_explainer']['types'],
  },
  'new_account.store': {
    methods: ["POST"],
    pattern: '/api/auth/register',
    tokens: [{"old":"/api/auth/register","type":0,"val":"api","end":""},{"old":"/api/auth/register","type":0,"val":"auth","end":""},{"old":"/api/auth/register","type":0,"val":"register","end":""}],
    types: placeholder as Registry['new_account.store']['types'],
  },
  'access_token.store': {
    methods: ["POST"],
    pattern: '/api/auth/login',
    tokens: [{"old":"/api/auth/login","type":0,"val":"api","end":""},{"old":"/api/auth/login","type":0,"val":"auth","end":""},{"old":"/api/auth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['access_token.store']['types'],
  },
  'google_auth.redirect': {
    methods: ["GET","HEAD"],
    pattern: '/api/auth/google',
    tokens: [{"old":"/api/auth/google","type":0,"val":"api","end":""},{"old":"/api/auth/google","type":0,"val":"auth","end":""},{"old":"/api/auth/google","type":0,"val":"google","end":""}],
    types: placeholder as Registry['google_auth.redirect']['types'],
  },
  'google_auth.callback': {
    methods: ["GET","HEAD"],
    pattern: '/api/auth/google/callback',
    tokens: [{"old":"/api/auth/google/callback","type":0,"val":"api","end":""},{"old":"/api/auth/google/callback","type":0,"val":"auth","end":""},{"old":"/api/auth/google/callback","type":0,"val":"google","end":""},{"old":"/api/auth/google/callback","type":0,"val":"callback","end":""}],
    types: placeholder as Registry['google_auth.callback']['types'],
  },
  'auth_verification.verify_email': {
    methods: ["GET","HEAD"],
    pattern: '/api/auth/verify-email',
    tokens: [{"old":"/api/auth/verify-email","type":0,"val":"api","end":""},{"old":"/api/auth/verify-email","type":0,"val":"auth","end":""},{"old":"/api/auth/verify-email","type":0,"val":"verify-email","end":""}],
    types: placeholder as Registry['auth_verification.verify_email']['types'],
  },
  'auth_verification.resend_verification': {
    methods: ["POST"],
    pattern: '/api/auth/resend-verification',
    tokens: [{"old":"/api/auth/resend-verification","type":0,"val":"api","end":""},{"old":"/api/auth/resend-verification","type":0,"val":"auth","end":""},{"old":"/api/auth/resend-verification","type":0,"val":"resend-verification","end":""}],
    types: placeholder as Registry['auth_verification.resend_verification']['types'],
  },
  'auth_verification.status': {
    methods: ["GET","HEAD"],
    pattern: '/api/auth/verification-status',
    tokens: [{"old":"/api/auth/verification-status","type":0,"val":"api","end":""},{"old":"/api/auth/verification-status","type":0,"val":"auth","end":""},{"old":"/api/auth/verification-status","type":0,"val":"verification-status","end":""}],
    types: placeholder as Registry['auth_verification.status']['types'],
  },
  'access_token.destroy': {
    methods: ["POST"],
    pattern: '/api/auth/logout',
    tokens: [{"old":"/api/auth/logout","type":0,"val":"api","end":""},{"old":"/api/auth/logout","type":0,"val":"auth","end":""},{"old":"/api/auth/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['access_token.destroy']['types'],
  },
  'profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/auth/me',
    tokens: [{"old":"/api/auth/me","type":0,"val":"api","end":""},{"old":"/api/auth/me","type":0,"val":"auth","end":""},{"old":"/api/auth/me","type":0,"val":"me","end":""}],
    types: placeholder as Registry['profile.show']['types'],
  },
  'user.update_profile': {
    methods: ["PATCH"],
    pattern: '/api/user/profile',
    tokens: [{"old":"/api/user/profile","type":0,"val":"api","end":""},{"old":"/api/user/profile","type":0,"val":"user","end":""},{"old":"/api/user/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['user.update_profile']['types'],
  },
  'user.update_password': {
    methods: ["PATCH"],
    pattern: '/api/user/password',
    tokens: [{"old":"/api/user/password","type":0,"val":"api","end":""},{"old":"/api/user/password","type":0,"val":"user","end":""},{"old":"/api/user/password","type":0,"val":"password","end":""}],
    types: placeholder as Registry['user.update_password']['types'],
  },
  'user.get_preferences': {
    methods: ["GET","HEAD"],
    pattern: '/api/user/preferences',
    tokens: [{"old":"/api/user/preferences","type":0,"val":"api","end":""},{"old":"/api/user/preferences","type":0,"val":"user","end":""},{"old":"/api/user/preferences","type":0,"val":"preferences","end":""}],
    types: placeholder as Registry['user.get_preferences']['types'],
  },
  'user.update_preferences': {
    methods: ["PATCH"],
    pattern: '/api/user/preferences',
    tokens: [{"old":"/api/user/preferences","type":0,"val":"api","end":""},{"old":"/api/user/preferences","type":0,"val":"user","end":""},{"old":"/api/user/preferences","type":0,"val":"preferences","end":""}],
    types: placeholder as Registry['user.update_preferences']['types'],
  },
  'user.destroy': {
    methods: ["DELETE"],
    pattern: '/api/user',
    tokens: [{"old":"/api/user","type":0,"val":"api","end":""},{"old":"/api/user","type":0,"val":"user","end":""}],
    types: placeholder as Registry['user.destroy']['types'],
  },
  'process_video.store': {
    methods: ["POST"],
    pattern: '/api/process-video',
    tokens: [{"old":"/api/process-video","type":0,"val":"api","end":""},{"old":"/api/process-video","type":0,"val":"process-video","end":""}],
    types: placeholder as Registry['process_video.store']['types'],
  },
  'job.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/job/:id',
    tokens: [{"old":"/api/job/:id","type":0,"val":"api","end":""},{"old":"/api/job/:id","type":0,"val":"job","end":""},{"old":"/api/job/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['job.show']['types'],
  },
  'job.update_status': {
    methods: ["POST"],
    pattern: '/api/job/:id/status',
    tokens: [{"old":"/api/job/:id/status","type":0,"val":"api","end":""},{"old":"/api/job/:id/status","type":0,"val":"job","end":""},{"old":"/api/job/:id/status","type":1,"val":"id","end":""},{"old":"/api/job/:id/status","type":0,"val":"status","end":""}],
    types: placeholder as Registry['job.update_status']['types'],
  },
  'job.complete': {
    methods: ["POST"],
    pattern: '/api/job/:id/complete',
    tokens: [{"old":"/api/job/:id/complete","type":0,"val":"api","end":""},{"old":"/api/job/:id/complete","type":0,"val":"job","end":""},{"old":"/api/job/:id/complete","type":1,"val":"id","end":""},{"old":"/api/job/:id/complete","type":0,"val":"complete","end":""}],
    types: placeholder as Registry['job.complete']['types'],
  },
  'clips.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/clips/:jobId',
    tokens: [{"old":"/api/clips/:jobId","type":0,"val":"api","end":""},{"old":"/api/clips/:jobId","type":0,"val":"clips","end":""},{"old":"/api/clips/:jobId","type":1,"val":"jobId","end":""}],
    types: placeholder as Registry['clips.index']['types'],
  },
  'render.render': {
    methods: ["POST"],
    pattern: '/api/job/:jobId/render',
    tokens: [{"old":"/api/job/:jobId/render","type":0,"val":"api","end":""},{"old":"/api/job/:jobId/render","type":0,"val":"job","end":""},{"old":"/api/job/:jobId/render","type":1,"val":"jobId","end":""},{"old":"/api/job/:jobId/render","type":0,"val":"render","end":""}],
    types: placeholder as Registry['render.render']['types'],
  },
  'render.render_status': {
    methods: ["GET","HEAD"],
    pattern: '/api/job/:jobId/render-status',
    tokens: [{"old":"/api/job/:jobId/render-status","type":0,"val":"api","end":""},{"old":"/api/job/:jobId/render-status","type":0,"val":"job","end":""},{"old":"/api/job/:jobId/render-status","type":1,"val":"jobId","end":""},{"old":"/api/job/:jobId/render-status","type":0,"val":"render-status","end":""}],
    types: placeholder as Registry['render.render_status']['types'],
  },
  'render.render_complete': {
    methods: ["POST"],
    pattern: '/api/job/:jobId/render-complete',
    tokens: [{"old":"/api/job/:jobId/render-complete","type":0,"val":"api","end":""},{"old":"/api/job/:jobId/render-complete","type":0,"val":"job","end":""},{"old":"/api/job/:jobId/render-complete","type":1,"val":"jobId","end":""},{"old":"/api/job/:jobId/render-complete","type":0,"val":"render-complete","end":""}],
    types: placeholder as Registry['render.render_complete']['types'],
  },
  'transcript.store': {
    methods: ["POST"],
    pattern: '/api/transcript',
    tokens: [{"old":"/api/transcript","type":0,"val":"api","end":""},{"old":"/api/transcript","type":0,"val":"transcript","end":""}],
    types: placeholder as Registry['transcript.store']['types'],
  },
  'transcript.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/transcript/:jobId',
    tokens: [{"old":"/api/transcript/:jobId","type":0,"val":"api","end":""},{"old":"/api/transcript/:jobId","type":0,"val":"transcript","end":""},{"old":"/api/transcript/:jobId","type":1,"val":"jobId","end":""}],
    types: placeholder as Registry['transcript.show']['types'],
  },
  'transcript.update_status': {
    methods: ["POST"],
    pattern: '/api/transcript/:jobId/status',
    tokens: [{"old":"/api/transcript/:jobId/status","type":0,"val":"api","end":""},{"old":"/api/transcript/:jobId/status","type":0,"val":"transcript","end":""},{"old":"/api/transcript/:jobId/status","type":1,"val":"jobId","end":""},{"old":"/api/transcript/:jobId/status","type":0,"val":"status","end":""}],
    types: placeholder as Registry['transcript.update_status']['types'],
  },
  'transcript.complete': {
    methods: ["POST"],
    pattern: '/api/transcript/:jobId/complete',
    tokens: [{"old":"/api/transcript/:jobId/complete","type":0,"val":"api","end":""},{"old":"/api/transcript/:jobId/complete","type":0,"val":"transcript","end":""},{"old":"/api/transcript/:jobId/complete","type":1,"val":"jobId","end":""},{"old":"/api/transcript/:jobId/complete","type":0,"val":"complete","end":""}],
    types: placeholder as Registry['transcript.complete']['types'],
  },
  'explainer.create': {
    methods: ["POST"],
    pattern: '/api/explainer',
    tokens: [{"old":"/api/explainer","type":0,"val":"api","end":""},{"old":"/api/explainer","type":0,"val":"explainer","end":""}],
    types: placeholder as Registry['explainer.create']['types'],
  },
  'explainer.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/explainer/:jobId',
    tokens: [{"old":"/api/explainer/:jobId","type":0,"val":"api","end":""},{"old":"/api/explainer/:jobId","type":0,"val":"explainer","end":""},{"old":"/api/explainer/:jobId","type":1,"val":"jobId","end":""}],
    types: placeholder as Registry['explainer.show']['types'],
  },
  'explainer.complete': {
    methods: ["POST"],
    pattern: '/api/explainer/:jobId/complete',
    tokens: [{"old":"/api/explainer/:jobId/complete","type":0,"val":"api","end":""},{"old":"/api/explainer/:jobId/complete","type":0,"val":"explainer","end":""},{"old":"/api/explainer/:jobId/complete","type":1,"val":"jobId","end":""},{"old":"/api/explainer/:jobId/complete","type":0,"val":"complete","end":""}],
    types: placeholder as Registry['explainer.complete']['types'],
  },
  'settings.get_credentials': {
    methods: ["GET","HEAD"],
    pattern: '/api/settings/social-credentials',
    tokens: [{"old":"/api/settings/social-credentials","type":0,"val":"api","end":""},{"old":"/api/settings/social-credentials","type":0,"val":"settings","end":""},{"old":"/api/settings/social-credentials","type":0,"val":"social-credentials","end":""}],
    types: placeholder as Registry['settings.get_credentials']['types'],
  },
  'settings.save_credentials': {
    methods: ["POST"],
    pattern: '/api/settings/social-credentials',
    tokens: [{"old":"/api/settings/social-credentials","type":0,"val":"api","end":""},{"old":"/api/settings/social-credentials","type":0,"val":"settings","end":""},{"old":"/api/settings/social-credentials","type":0,"val":"social-credentials","end":""}],
    types: placeholder as Registry['settings.save_credentials']['types'],
  },
  'settings.delete_credentials': {
    methods: ["DELETE"],
    pattern: '/api/settings/social-credentials/:platform',
    tokens: [{"old":"/api/settings/social-credentials/:platform","type":0,"val":"api","end":""},{"old":"/api/settings/social-credentials/:platform","type":0,"val":"settings","end":""},{"old":"/api/settings/social-credentials/:platform","type":0,"val":"social-credentials","end":""},{"old":"/api/settings/social-credentials/:platform","type":1,"val":"platform","end":""}],
    types: placeholder as Registry['settings.delete_credentials']['types'],
  },
  'social.connect': {
    methods: ["POST"],
    pattern: '/api/social/connect',
    tokens: [{"old":"/api/social/connect","type":0,"val":"api","end":""},{"old":"/api/social/connect","type":0,"val":"social","end":""},{"old":"/api/social/connect","type":0,"val":"connect","end":""}],
    types: placeholder as Registry['social.connect']['types'],
  },
  'social.platform_status': {
    methods: ["GET","HEAD"],
    pattern: '/api/social/platform-status',
    tokens: [{"old":"/api/social/platform-status","type":0,"val":"api","end":""},{"old":"/api/social/platform-status","type":0,"val":"social","end":""},{"old":"/api/social/platform-status","type":0,"val":"platform-status","end":""}],
    types: placeholder as Registry['social.platform_status']['types'],
  },
  'social.accounts': {
    methods: ["GET","HEAD"],
    pattern: '/api/social/accounts',
    tokens: [{"old":"/api/social/accounts","type":0,"val":"api","end":""},{"old":"/api/social/accounts","type":0,"val":"social","end":""},{"old":"/api/social/accounts","type":0,"val":"accounts","end":""}],
    types: placeholder as Registry['social.accounts']['types'],
  },
  'social.disconnect_account': {
    methods: ["DELETE"],
    pattern: '/api/social/accounts/:id',
    tokens: [{"old":"/api/social/accounts/:id","type":0,"val":"api","end":""},{"old":"/api/social/accounts/:id","type":0,"val":"social","end":""},{"old":"/api/social/accounts/:id","type":0,"val":"accounts","end":""},{"old":"/api/social/accounts/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['social.disconnect_account']['types'],
  },
  'social.post': {
    methods: ["POST"],
    pattern: '/api/social/post',
    tokens: [{"old":"/api/social/post","type":0,"val":"api","end":""},{"old":"/api/social/post","type":0,"val":"social","end":""},{"old":"/api/social/post","type":0,"val":"post","end":""}],
    types: placeholder as Registry['social.post']['types'],
  },
  'social.campaign': {
    methods: ["POST"],
    pattern: '/api/social/campaign',
    tokens: [{"old":"/api/social/campaign","type":0,"val":"api","end":""},{"old":"/api/social/campaign","type":0,"val":"social","end":""},{"old":"/api/social/campaign","type":0,"val":"campaign","end":""}],
    types: placeholder as Registry['social.campaign']['types'],
  },
  'social.post_status': {
    methods: ["GET","HEAD"],
    pattern: '/api/social/post/:id/status',
    tokens: [{"old":"/api/social/post/:id/status","type":0,"val":"api","end":""},{"old":"/api/social/post/:id/status","type":0,"val":"social","end":""},{"old":"/api/social/post/:id/status","type":0,"val":"post","end":""},{"old":"/api/social/post/:id/status","type":1,"val":"id","end":""},{"old":"/api/social/post/:id/status","type":0,"val":"status","end":""}],
    types: placeholder as Registry['social.post_status']['types'],
  },
  'social.retry_post': {
    methods: ["POST"],
    pattern: '/api/social/post/:id/retry',
    tokens: [{"old":"/api/social/post/:id/retry","type":0,"val":"api","end":""},{"old":"/api/social/post/:id/retry","type":0,"val":"social","end":""},{"old":"/api/social/post/:id/retry","type":0,"val":"post","end":""},{"old":"/api/social/post/:id/retry","type":1,"val":"id","end":""},{"old":"/api/social/post/:id/retry","type":0,"val":"retry","end":""}],
    types: placeholder as Registry['social.retry_post']['types'],
  },
  'social.posts': {
    methods: ["GET","HEAD"],
    pattern: '/api/social/posts',
    tokens: [{"old":"/api/social/posts","type":0,"val":"api","end":""},{"old":"/api/social/posts","type":0,"val":"social","end":""},{"old":"/api/social/posts","type":0,"val":"posts","end":""}],
    types: placeholder as Registry['social.posts']['types'],
  },
  'social.scheduled': {
    methods: ["GET","HEAD"],
    pattern: '/api/social/scheduled',
    tokens: [{"old":"/api/social/scheduled","type":0,"val":"api","end":""},{"old":"/api/social/scheduled","type":0,"val":"social","end":""},{"old":"/api/social/scheduled","type":0,"val":"scheduled","end":""}],
    types: placeholder as Registry['social.scheduled']['types'],
  },
  'social.process_scheduled': {
    methods: ["POST"],
    pattern: '/api/social/process-scheduled',
    tokens: [{"old":"/api/social/process-scheduled","type":0,"val":"api","end":""},{"old":"/api/social/process-scheduled","type":0,"val":"social","end":""},{"old":"/api/social/process-scheduled","type":0,"val":"process-scheduled","end":""}],
    types: placeholder as Registry['social.process_scheduled']['types'],
  },
  'social.scheduler_run': {
    methods: ["POST"],
    pattern: '/api/social/scheduler/run',
    tokens: [{"old":"/api/social/scheduler/run","type":0,"val":"api","end":""},{"old":"/api/social/scheduler/run","type":0,"val":"social","end":""},{"old":"/api/social/scheduler/run","type":0,"val":"scheduler","end":""},{"old":"/api/social/scheduler/run","type":0,"val":"run","end":""}],
    types: placeholder as Registry['social.scheduler_run']['types'],
  },
  'social.facebook_pending_pages': {
    methods: ["GET","HEAD"],
    pattern: '/api/social/facebook/pending-pages',
    tokens: [{"old":"/api/social/facebook/pending-pages","type":0,"val":"api","end":""},{"old":"/api/social/facebook/pending-pages","type":0,"val":"social","end":""},{"old":"/api/social/facebook/pending-pages","type":0,"val":"facebook","end":""},{"old":"/api/social/facebook/pending-pages","type":0,"val":"pending-pages","end":""}],
    types: placeholder as Registry['social.facebook_pending_pages']['types'],
  },
  'social.facebook_select_page': {
    methods: ["POST"],
    pattern: '/api/social/facebook/select-page',
    tokens: [{"old":"/api/social/facebook/select-page","type":0,"val":"api","end":""},{"old":"/api/social/facebook/select-page","type":0,"val":"social","end":""},{"old":"/api/social/facebook/select-page","type":0,"val":"facebook","end":""},{"old":"/api/social/facebook/select-page","type":0,"val":"select-page","end":""}],
    types: placeholder as Registry['social.facebook_select_page']['types'],
  },
  'hashtags.generate': {
    methods: ["POST"],
    pattern: '/api/hashtags/generate',
    tokens: [{"old":"/api/hashtags/generate","type":0,"val":"api","end":""},{"old":"/api/hashtags/generate","type":0,"val":"hashtags","end":""},{"old":"/api/hashtags/generate","type":0,"val":"generate","end":""}],
    types: placeholder as Registry['hashtags.generate']['types'],
  },
  'notifications.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/notifications',
    tokens: [{"old":"/api/notifications","type":0,"val":"api","end":""},{"old":"/api/notifications","type":0,"val":"notifications","end":""}],
    types: placeholder as Registry['notifications.index']['types'],
  },
  'notifications.mark_all_read': {
    methods: ["POST"],
    pattern: '/api/notifications/read-all',
    tokens: [{"old":"/api/notifications/read-all","type":0,"val":"api","end":""},{"old":"/api/notifications/read-all","type":0,"val":"notifications","end":""},{"old":"/api/notifications/read-all","type":0,"val":"read-all","end":""}],
    types: placeholder as Registry['notifications.mark_all_read']['types'],
  },
  'notifications.mark_read': {
    methods: ["POST"],
    pattern: '/api/notifications/:id/read',
    tokens: [{"old":"/api/notifications/:id/read","type":0,"val":"api","end":""},{"old":"/api/notifications/:id/read","type":0,"val":"notifications","end":""},{"old":"/api/notifications/:id/read","type":1,"val":"id","end":""},{"old":"/api/notifications/:id/read","type":0,"val":"read","end":""}],
    types: placeholder as Registry['notifications.mark_read']['types'],
  },
  'social_o_auth.youtube_callback': {
    methods: ["GET","HEAD"],
    pattern: '/api/social/oauth/youtube/callback',
    tokens: [{"old":"/api/social/oauth/youtube/callback","type":0,"val":"api","end":""},{"old":"/api/social/oauth/youtube/callback","type":0,"val":"social","end":""},{"old":"/api/social/oauth/youtube/callback","type":0,"val":"oauth","end":""},{"old":"/api/social/oauth/youtube/callback","type":0,"val":"youtube","end":""},{"old":"/api/social/oauth/youtube/callback","type":0,"val":"callback","end":""}],
    types: placeholder as Registry['social_o_auth.youtube_callback']['types'],
  },
  'social_o_auth.tiktok_callback': {
    methods: ["GET","HEAD"],
    pattern: '/api/social/oauth/tiktok/callback',
    tokens: [{"old":"/api/social/oauth/tiktok/callback","type":0,"val":"api","end":""},{"old":"/api/social/oauth/tiktok/callback","type":0,"val":"social","end":""},{"old":"/api/social/oauth/tiktok/callback","type":0,"val":"oauth","end":""},{"old":"/api/social/oauth/tiktok/callback","type":0,"val":"tiktok","end":""},{"old":"/api/social/oauth/tiktok/callback","type":0,"val":"callback","end":""}],
    types: placeholder as Registry['social_o_auth.tiktok_callback']['types'],
  },
  'social_o_auth.instagram_callback': {
    methods: ["GET","HEAD"],
    pattern: '/api/social/oauth/instagram/callback',
    tokens: [{"old":"/api/social/oauth/instagram/callback","type":0,"val":"api","end":""},{"old":"/api/social/oauth/instagram/callback","type":0,"val":"social","end":""},{"old":"/api/social/oauth/instagram/callback","type":0,"val":"oauth","end":""},{"old":"/api/social/oauth/instagram/callback","type":0,"val":"instagram","end":""},{"old":"/api/social/oauth/instagram/callback","type":0,"val":"callback","end":""}],
    types: placeholder as Registry['social_o_auth.instagram_callback']['types'],
  },
  'social_o_auth.facebook_callback': {
    methods: ["GET","HEAD"],
    pattern: '/api/social/oauth/facebook/callback',
    tokens: [{"old":"/api/social/oauth/facebook/callback","type":0,"val":"api","end":""},{"old":"/api/social/oauth/facebook/callback","type":0,"val":"social","end":""},{"old":"/api/social/oauth/facebook/callback","type":0,"val":"oauth","end":""},{"old":"/api/social/oauth/facebook/callback","type":0,"val":"facebook","end":""},{"old":"/api/social/oauth/facebook/callback","type":0,"val":"callback","end":""}],
    types: placeholder as Registry['social_o_auth.facebook_callback']['types'],
  },
  'admin.stats': {
    methods: ["GET","HEAD"],
    pattern: '/api/admin/stats',
    tokens: [{"old":"/api/admin/stats","type":0,"val":"api","end":""},{"old":"/api/admin/stats","type":0,"val":"admin","end":""},{"old":"/api/admin/stats","type":0,"val":"stats","end":""}],
    types: placeholder as Registry['admin.stats']['types'],
  },
  'admin.users': {
    methods: ["GET","HEAD"],
    pattern: '/api/admin/users',
    tokens: [{"old":"/api/admin/users","type":0,"val":"api","end":""},{"old":"/api/admin/users","type":0,"val":"admin","end":""},{"old":"/api/admin/users","type":0,"val":"users","end":""}],
    types: placeholder as Registry['admin.users']['types'],
  },
  'admin.update_role': {
    methods: ["PATCH"],
    pattern: '/api/admin/users/:id/role',
    tokens: [{"old":"/api/admin/users/:id/role","type":0,"val":"api","end":""},{"old":"/api/admin/users/:id/role","type":0,"val":"admin","end":""},{"old":"/api/admin/users/:id/role","type":0,"val":"users","end":""},{"old":"/api/admin/users/:id/role","type":1,"val":"id","end":""},{"old":"/api/admin/users/:id/role","type":0,"val":"role","end":""}],
    types: placeholder as Registry['admin.update_role']['types'],
  },
  'admin.delete_user': {
    methods: ["DELETE"],
    pattern: '/api/admin/users/:id',
    tokens: [{"old":"/api/admin/users/:id","type":0,"val":"api","end":""},{"old":"/api/admin/users/:id","type":0,"val":"admin","end":""},{"old":"/api/admin/users/:id","type":0,"val":"users","end":""},{"old":"/api/admin/users/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['admin.delete_user']['types'],
  },
  'admin.get_social_credentials': {
    methods: ["GET","HEAD"],
    pattern: '/api/admin/social-credentials',
    tokens: [{"old":"/api/admin/social-credentials","type":0,"val":"api","end":""},{"old":"/api/admin/social-credentials","type":0,"val":"admin","end":""},{"old":"/api/admin/social-credentials","type":0,"val":"social-credentials","end":""}],
    types: placeholder as Registry['admin.get_social_credentials']['types'],
  },
  'admin.save_social_credentials': {
    methods: ["POST"],
    pattern: '/api/admin/social-credentials',
    tokens: [{"old":"/api/admin/social-credentials","type":0,"val":"api","end":""},{"old":"/api/admin/social-credentials","type":0,"val":"admin","end":""},{"old":"/api/admin/social-credentials","type":0,"val":"social-credentials","end":""}],
    types: placeholder as Registry['admin.save_social_credentials']['types'],
  },
  'admin.delete_social_credentials': {
    methods: ["DELETE"],
    pattern: '/api/admin/social-credentials/:platform',
    tokens: [{"old":"/api/admin/social-credentials/:platform","type":0,"val":"api","end":""},{"old":"/api/admin/social-credentials/:platform","type":0,"val":"admin","end":""},{"old":"/api/admin/social-credentials/:platform","type":0,"val":"social-credentials","end":""},{"old":"/api/admin/social-credentials/:platform","type":1,"val":"platform","end":""}],
    types: placeholder as Registry['admin.delete_social_credentials']['types'],
  },
  'admin.jobs': {
    methods: ["GET","HEAD"],
    pattern: '/api/admin/jobs',
    tokens: [{"old":"/api/admin/jobs","type":0,"val":"api","end":""},{"old":"/api/admin/jobs","type":0,"val":"admin","end":""},{"old":"/api/admin/jobs","type":0,"val":"jobs","end":""}],
    types: placeholder as Registry['admin.jobs']['types'],
  },
  'admin.job_detail': {
    methods: ["GET","HEAD"],
    pattern: '/api/admin/jobs/:id',
    tokens: [{"old":"/api/admin/jobs/:id","type":0,"val":"api","end":""},{"old":"/api/admin/jobs/:id","type":0,"val":"admin","end":""},{"old":"/api/admin/jobs/:id","type":0,"val":"jobs","end":""},{"old":"/api/admin/jobs/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['admin.job_detail']['types'],
  },
  'admin.revenue': {
    methods: ["GET","HEAD"],
    pattern: '/api/admin/revenue',
    tokens: [{"old":"/api/admin/revenue","type":0,"val":"api","end":""},{"old":"/api/admin/revenue","type":0,"val":"admin","end":""},{"old":"/api/admin/revenue","type":0,"val":"revenue","end":""}],
    types: placeholder as Registry['admin.revenue']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
