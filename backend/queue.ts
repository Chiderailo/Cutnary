/*
|--------------------------------------------------------------------------
| BullMQ Queue Configuration
|--------------------------------------------------------------------------
|
| HOW THE QUEUE WORKS:
| --------------------
| BullMQ stores jobs in Redis as a list. When we call queue.add(), BullMQ:
| 1. Serializes the job payload to JSON and pushes it to a Redis list
| 2. Assigns a unique BullMQ job ID (we use our job_id for traceability)
| 3. Jobs sit in the "wait" state until a worker processes them
|
| The Python worker connects to the SAME Redis instance and runs a Worker
| process that polls the queue. When a job appears, the worker receives
| the payload and executes the processing logic.
|
| HOW THE PYTHON WORKER CONSUMES JOBS:
| ------------------------------------
| 1. Connect to Redis using REDIS_HOST and REDIS_PORT (same as backend)
| 2. Create a Worker for the "video_jobs" queue name
| 3. Register a processor function that receives job.data (the payload)
| 4. Each job.data contains: { job_id, video_url, status: "queued" }
| 5. After processing, call POST /api/job/:id/complete to report results
|
| Example Python usage (using arq or rq or similar):
|   worker = Worker('video_jobs', process_video_job, redis_connection)
|   worker.run()
|
*/

import { Queue } from 'bullmq'
import type IORedis from 'ioredis'
import env from '#start/env'

/** Queue names - must match the Python AI worker's queue names */
export const VIDEO_JOBS_QUEUE_NAME = 'video_jobs'
export const RENDER_JOBS_QUEUE_NAME = 'render_jobs'
export const TRANSCRIPT_JOBS_QUEUE_NAME = 'transcript_jobs'

/** Processing settings passed to the worker */
export interface VideoJobSettings {
  aspect_ratio?: string
  clip_length?: string
  caption_style?: string
  language?: string
}

/** Job payload shape - what the Python worker receives in job.data */
export interface VideoJobPayload {
  job_id: string
  video_url: string
  status: 'queued'
  aspect_ratio?: string
  clip_length?: string
  settings?: VideoJobSettings
}

/** Redis connection options for BullMQ */
const redisConnection = {
  host: env.get('REDIS_HOST'),
  port: env.get('REDIS_PORT'),
  // BullMQ requires maxRetriesPerRequest: null when using ioredis
  maxRetriesPerRequest: null,
} as const

/**
 * Redis connection - reused for Queue and Worker
 * Lazy-initialized to avoid connection at import time
 */
let _connection: IORedis | undefined

/**
 * Get or create the Redis connection
 */
async function getConnection(): Promise<IORedis> {
  if (!_connection) {
    const IORedis = (await import('ioredis')).default
    _connection = new IORedis(redisConnection)
  }
  return _connection
}

/**
 * Video jobs queue instance
 * Pushes jobs with payload: { job_id, video_url, status: "queued" }
 */
let _queue: Queue | undefined

/**
 * Get the video jobs queue instance
 */
export async function getVideoJobsQueue(): Promise<Queue> {
  if (!_queue) {
    const connection = await getConnection()
    _queue = new Queue(VIDEO_JOBS_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
      },
    })
  }
  return _queue
}

/**
 * Push a video processing job to the Redis queue.
 * The Python worker consumes from this queue and receives the payload.
 *
 * @param jobId - Unique job ID (UUID)
 * @param videoUrl - URL of the video to process (e.g. YouTube link)
 * @param settings - Optional processing settings (aspect_ratio, clip_length, caption_style)
 * @returns BullMQ job ID
 */
export async function addVideoProcessingJob(
  jobId: string,
  videoUrl: string,
  settings?: VideoJobSettings
): Promise<string> {
  const queue = await getVideoJobsQueue()

  const payload: VideoJobPayload = {
    job_id: jobId,
    video_url: videoUrl,
    status: 'queued',
    aspect_ratio: settings?.aspect_ratio ?? '9:16',
    clip_length: settings?.clip_length ?? 'auto',
    ...(settings && Object.keys(settings).length ? { settings } : {}),
  }

  const job = await queue.add('process', payload, { jobId })
  return job.id!
}

/** Render job payload - what the Python render worker receives */
export interface RenderJobPayload {
  job_id: string
  clip_url: string
  captions: Array<{
    start: number
    end: number
    text: string
    words?: Array<{ word: string; start: number; end: number }>
  }>
  style: string
  position: string
  fontSize: string
  trimStart: number
  trimEnd: number
  textColor: string
  backgroundColor: string
  backgroundOpacity: number
}

let _renderQueue: Queue | undefined

export async function getRenderJobsQueue(): Promise<Queue> {
  if (!_renderQueue) {
    const connection = await getConnection()
    _renderQueue = new Queue(RENDER_JOBS_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 2000 },
        removeOnComplete: 50,
      },
    })
  }
  return _renderQueue
}

export async function addRenderJob(payload: RenderJobPayload): Promise<string> {
  const queue = await getRenderJobsQueue()
  const jobId = payload.job_id
  const job = await queue.add('render', payload, { jobId })
  return job.id!
}

/** Transcript job payload */
export interface TranscriptJobPayload {
  video_url: string
  language: string
  speaker_separation: boolean
  video_title?: string
}

let _transcriptQueue: Queue | undefined

export async function getTranscriptJobsQueue(): Promise<Queue> {
  if (!_transcriptQueue) {
    const connection = await getConnection()
    _transcriptQueue = new Queue(TRANSCRIPT_JOBS_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 50,
      },
    })
  }
  return _transcriptQueue
}

export async function addTranscriptJob(
  jobId: string,
  payload: TranscriptJobPayload
): Promise<string> {
  const queue = await getTranscriptJobsQueue()
  const job = await queue.add('transcript', payload, { jobId })
  return job.id!
}
