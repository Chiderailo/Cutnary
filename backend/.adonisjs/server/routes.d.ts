import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'storage.serve_clip': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_video': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_render': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_thumbnail': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_explainer': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'access_token.store': { paramsTuple?: []; params?: {} }
    'google_auth.redirect': { paramsTuple?: []; params?: {} }
    'google_auth.callback': { paramsTuple?: []; params?: {} }
    'auth_verification.verify_email': { paramsTuple?: []; params?: {} }
    'auth_verification.resend_verification': { paramsTuple?: []; params?: {} }
    'auth_verification.status': { paramsTuple?: []; params?: {} }
    'access_token.destroy': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'user.update_profile': { paramsTuple?: []; params?: {} }
    'user.update_password': { paramsTuple?: []; params?: {} }
    'user.get_preferences': { paramsTuple?: []; params?: {} }
    'user.update_preferences': { paramsTuple?: []; params?: {} }
    'user.destroy': { paramsTuple?: []; params?: {} }
    'process_video.store': { paramsTuple?: []; params?: {} }
    'job.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job.update_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clips.index': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'render.render': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'render.render_status': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'render.render_complete': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'transcript.store': { paramsTuple?: []; params?: {} }
    'transcript.show': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'transcript.update_status': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'transcript.complete': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'explainer.create': { paramsTuple?: []; params?: {} }
    'explainer.show': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'explainer.complete': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'settings.get_credentials': { paramsTuple?: []; params?: {} }
    'settings.save_credentials': { paramsTuple?: []; params?: {} }
    'settings.delete_credentials': { paramsTuple: [ParamValue]; params: {'platform': ParamValue} }
    'social.connect': { paramsTuple?: []; params?: {} }
    'social.platform_status': { paramsTuple?: []; params?: {} }
    'social.accounts': { paramsTuple?: []; params?: {} }
    'social.disconnect_account': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'social.post': { paramsTuple?: []; params?: {} }
    'social.campaign': { paramsTuple?: []; params?: {} }
    'social.post_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'social.retry_post': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'social.posts': { paramsTuple?: []; params?: {} }
    'social.scheduled': { paramsTuple?: []; params?: {} }
    'social.process_scheduled': { paramsTuple?: []; params?: {} }
    'social.scheduler_run': { paramsTuple?: []; params?: {} }
    'social.facebook_pending_pages': { paramsTuple?: []; params?: {} }
    'social.facebook_select_page': { paramsTuple?: []; params?: {} }
    'hashtags.generate': { paramsTuple?: []; params?: {} }
    'notifications.index': { paramsTuple?: []; params?: {} }
    'notifications.mark_all_read': { paramsTuple?: []; params?: {} }
    'notifications.mark_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'social_o_auth.youtube_callback': { paramsTuple?: []; params?: {} }
    'social_o_auth.tiktok_callback': { paramsTuple?: []; params?: {} }
    'social_o_auth.instagram_callback': { paramsTuple?: []; params?: {} }
    'social_o_auth.facebook_callback': { paramsTuple?: []; params?: {} }
    'admin.stats': { paramsTuple?: []; params?: {} }
    'admin.users': { paramsTuple?: []; params?: {} }
    'admin.update_role': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.delete_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.get_social_credentials': { paramsTuple?: []; params?: {} }
    'admin.save_social_credentials': { paramsTuple?: []; params?: {} }
    'admin.delete_social_credentials': { paramsTuple: [ParamValue]; params: {'platform': ParamValue} }
    'admin.jobs': { paramsTuple?: []; params?: {} }
    'admin.job_detail': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.revenue': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'storage.serve_clip': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_video': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_render': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_thumbnail': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_explainer': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'google_auth.redirect': { paramsTuple?: []; params?: {} }
    'google_auth.callback': { paramsTuple?: []; params?: {} }
    'auth_verification.verify_email': { paramsTuple?: []; params?: {} }
    'auth_verification.status': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'user.get_preferences': { paramsTuple?: []; params?: {} }
    'job.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clips.index': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'render.render_status': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'transcript.show': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'explainer.show': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'settings.get_credentials': { paramsTuple?: []; params?: {} }
    'social.platform_status': { paramsTuple?: []; params?: {} }
    'social.accounts': { paramsTuple?: []; params?: {} }
    'social.post_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'social.posts': { paramsTuple?: []; params?: {} }
    'social.scheduled': { paramsTuple?: []; params?: {} }
    'social.facebook_pending_pages': { paramsTuple?: []; params?: {} }
    'notifications.index': { paramsTuple?: []; params?: {} }
    'social_o_auth.youtube_callback': { paramsTuple?: []; params?: {} }
    'social_o_auth.tiktok_callback': { paramsTuple?: []; params?: {} }
    'social_o_auth.instagram_callback': { paramsTuple?: []; params?: {} }
    'social_o_auth.facebook_callback': { paramsTuple?: []; params?: {} }
    'admin.stats': { paramsTuple?: []; params?: {} }
    'admin.users': { paramsTuple?: []; params?: {} }
    'admin.get_social_credentials': { paramsTuple?: []; params?: {} }
    'admin.jobs': { paramsTuple?: []; params?: {} }
    'admin.job_detail': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.revenue': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'storage.serve_clip': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_video': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_render': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_thumbnail': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_explainer': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'google_auth.redirect': { paramsTuple?: []; params?: {} }
    'google_auth.callback': { paramsTuple?: []; params?: {} }
    'auth_verification.verify_email': { paramsTuple?: []; params?: {} }
    'auth_verification.status': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'user.get_preferences': { paramsTuple?: []; params?: {} }
    'job.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clips.index': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'render.render_status': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'transcript.show': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'explainer.show': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'settings.get_credentials': { paramsTuple?: []; params?: {} }
    'social.platform_status': { paramsTuple?: []; params?: {} }
    'social.accounts': { paramsTuple?: []; params?: {} }
    'social.post_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'social.posts': { paramsTuple?: []; params?: {} }
    'social.scheduled': { paramsTuple?: []; params?: {} }
    'social.facebook_pending_pages': { paramsTuple?: []; params?: {} }
    'notifications.index': { paramsTuple?: []; params?: {} }
    'social_o_auth.youtube_callback': { paramsTuple?: []; params?: {} }
    'social_o_auth.tiktok_callback': { paramsTuple?: []; params?: {} }
    'social_o_auth.instagram_callback': { paramsTuple?: []; params?: {} }
    'social_o_auth.facebook_callback': { paramsTuple?: []; params?: {} }
    'admin.stats': { paramsTuple?: []; params?: {} }
    'admin.users': { paramsTuple?: []; params?: {} }
    'admin.get_social_credentials': { paramsTuple?: []; params?: {} }
    'admin.jobs': { paramsTuple?: []; params?: {} }
    'admin.job_detail': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.revenue': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'access_token.store': { paramsTuple?: []; params?: {} }
    'auth_verification.resend_verification': { paramsTuple?: []; params?: {} }
    'access_token.destroy': { paramsTuple?: []; params?: {} }
    'process_video.store': { paramsTuple?: []; params?: {} }
    'job.update_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'render.render': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'render.render_complete': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'transcript.store': { paramsTuple?: []; params?: {} }
    'transcript.update_status': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'transcript.complete': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'explainer.create': { paramsTuple?: []; params?: {} }
    'explainer.complete': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'settings.save_credentials': { paramsTuple?: []; params?: {} }
    'social.connect': { paramsTuple?: []; params?: {} }
    'social.post': { paramsTuple?: []; params?: {} }
    'social.campaign': { paramsTuple?: []; params?: {} }
    'social.retry_post': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'social.process_scheduled': { paramsTuple?: []; params?: {} }
    'social.scheduler_run': { paramsTuple?: []; params?: {} }
    'social.facebook_select_page': { paramsTuple?: []; params?: {} }
    'hashtags.generate': { paramsTuple?: []; params?: {} }
    'notifications.mark_all_read': { paramsTuple?: []; params?: {} }
    'notifications.mark_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.save_social_credentials': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'user.update_profile': { paramsTuple?: []; params?: {} }
    'user.update_password': { paramsTuple?: []; params?: {} }
    'user.update_preferences': { paramsTuple?: []; params?: {} }
    'admin.update_role': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'user.destroy': { paramsTuple?: []; params?: {} }
    'settings.delete_credentials': { paramsTuple: [ParamValue]; params: {'platform': ParamValue} }
    'social.disconnect_account': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.delete_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.delete_social_credentials': { paramsTuple: [ParamValue]; params: {'platform': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}