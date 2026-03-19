/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
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
