import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'storage.serve_clip': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_video': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_render': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'access_token.store': { paramsTuple?: []; params?: {} }
    'access_token.destroy': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
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
  }
  GET: {
    'storage.serve_clip': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_video': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_render': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'job.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clips.index': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'render.render_status': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'transcript.show': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
  }
  HEAD: {
    'storage.serve_clip': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_video': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'storage.serve_render': { paramsTuple: [ParamValue]; params: {'filename': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'job.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clips.index': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'render.render_status': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'transcript.show': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'access_token.store': { paramsTuple?: []; params?: {} }
    'access_token.destroy': { paramsTuple?: []; params?: {} }
    'process_video.store': { paramsTuple?: []; params?: {} }
    'job.update_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'render.render': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'render.render_complete': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'transcript.store': { paramsTuple?: []; params?: {} }
    'transcript.update_status': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'transcript.complete': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}