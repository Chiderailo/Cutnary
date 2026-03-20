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
