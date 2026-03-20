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
}
