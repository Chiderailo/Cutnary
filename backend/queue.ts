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

/** Queue name - must match the Python AI worker's queue name */
export const VIDEO_JOBS_QUEUE_NAME = 'video_jobs'

/** Job payload shape - what the Python worker receives in job.data */
export interface VideoJobPayload {
  job_id: string
  video_url: string
  status: 'queued'
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
 * @returns BullMQ job ID
 */
export async function addVideoProcessingJob(
  jobId: string,
  videoUrl: string
): Promise<string> {
  const queue = await getVideoJobsQueue()

  const payload: VideoJobPayload = {
    job_id: jobId,
    video_url: videoUrl,
    status: 'queued',
  }

  const job = await queue.add('process', payload, { jobId })
  return job.id!
}
