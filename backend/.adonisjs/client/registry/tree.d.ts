/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  storage: {
    serveClip: typeof routes['storage.serve_clip']
    serveVideo: typeof routes['storage.serve_video']
    serveRender: typeof routes['storage.serve_render']
    serveThumbnail: typeof routes['storage.serve_thumbnail']
    serveExplainer: typeof routes['storage.serve_explainer']
  }
  newAccount: {
    store: typeof routes['new_account.store']
  }
  accessToken: {
    store: typeof routes['access_token.store']
    destroy: typeof routes['access_token.destroy']
  }
  googleAuth: {
    redirect: typeof routes['google_auth.redirect']
    callback: typeof routes['google_auth.callback']
  }
  authVerification: {
    verifyEmail: typeof routes['auth_verification.verify_email']
    resendVerification: typeof routes['auth_verification.resend_verification']
    status: typeof routes['auth_verification.status']
  }
  profile: {
    show: typeof routes['profile.show']
  }
  user: {
    updateProfile: typeof routes['user.update_profile']
    updatePassword: typeof routes['user.update_password']
    getPreferences: typeof routes['user.get_preferences']
    updatePreferences: typeof routes['user.update_preferences']
    destroy: typeof routes['user.destroy']
  }
  processVideo: {
    store: typeof routes['process_video.store']
  }
  job: {
    show: typeof routes['job.show']
    updateStatus: typeof routes['job.update_status']
    complete: typeof routes['job.complete']
  }
  clips: {
    index: typeof routes['clips.index']
  }
  render: {
    render: typeof routes['render.render']
    renderStatus: typeof routes['render.render_status']
    renderComplete: typeof routes['render.render_complete']
  }
  transcript: {
    store: typeof routes['transcript.store']
    show: typeof routes['transcript.show']
    updateStatus: typeof routes['transcript.update_status']
    complete: typeof routes['transcript.complete']
  }
  explainer: {
    create: typeof routes['explainer.create']
    show: typeof routes['explainer.show']
    complete: typeof routes['explainer.complete']
  }
  settings: {
    getCredentials: typeof routes['settings.get_credentials']
    saveCredentials: typeof routes['settings.save_credentials']
    deleteCredentials: typeof routes['settings.delete_credentials']
  }
  social: {
    connect: typeof routes['social.connect']
    platformStatus: typeof routes['social.platform_status']
    accounts: typeof routes['social.accounts']
    disconnectAccount: typeof routes['social.disconnect_account']
    post: typeof routes['social.post']
    campaign: typeof routes['social.campaign']
    postStatus: typeof routes['social.post_status']
    retryPost: typeof routes['social.retry_post']
    posts: typeof routes['social.posts']
    scheduled: typeof routes['social.scheduled']
    processScheduled: typeof routes['social.process_scheduled']
    schedulerRun: typeof routes['social.scheduler_run']
    facebookPendingPages: typeof routes['social.facebook_pending_pages']
    facebookSelectPage: typeof routes['social.facebook_select_page']
  }
  hashtags: {
    generate: typeof routes['hashtags.generate']
  }
  notifications: {
    index: typeof routes['notifications.index']
    markAllRead: typeof routes['notifications.mark_all_read']
    markRead: typeof routes['notifications.mark_read']
  }
  socialOAuth: {
    youtubeCallback: typeof routes['social_o_auth.youtube_callback']
    tiktokCallback: typeof routes['social_o_auth.tiktok_callback']
    instagramCallback: typeof routes['social_o_auth.instagram_callback']
    facebookCallback: typeof routes['social_o_auth.facebook_callback']
  }
  admin: {
    stats: typeof routes['admin.stats']
    users: typeof routes['admin.users']
    updateRole: typeof routes['admin.update_role']
    deleteUser: typeof routes['admin.delete_user']
    getSocialCredentials: typeof routes['admin.get_social_credentials']
    saveSocialCredentials: typeof routes['admin.save_social_credentials']
    deleteSocialCredentials: typeof routes['admin.delete_social_credentials']
    jobs: typeof routes['admin.jobs']
    jobDetail: typeof routes['admin.job_detail']
    revenue: typeof routes['admin.revenue']
  }
}
