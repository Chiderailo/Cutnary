import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'process_video.store': { paramsTuple?: []; params?: {} }
    'job.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clips.index': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
  }
  GET: {
    'job.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clips.index': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
  }
  HEAD: {
    'job.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clips.index': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
  }
  POST: {
    'process_video.store': { paramsTuple?: []; params?: {} }
    'job.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}