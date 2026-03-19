/*
|--------------------------------------------------------------------------
| Job Service
|--------------------------------------------------------------------------
|
| In-memory job store for tracking video processing jobs.
| The Python AI worker consumes jobs from the Redis queue and updates
| job status. This service provides:
| - Unique job ID generation (UUID v4)
| - In-memory storage for job metadata and status
| - Clips storage when the AI worker completes processing
|
| Note: Jobs are stored in memory only. On server restart, all job
| data is lost. For production, consider using Redis or a database.
|
*/

import { randomUUID } from 'node:crypto'

/**
 * Job status lifecycle - detailed progress for frontend:
 * - queued: Job created, waiting for worker to pick up
 * - downloading: Worker is downloading the video
 * - transcribing: Extracting audio and transcribing with Whisper
 * - detecting_clips: AI detecting viral moments / emotional hooks
 * - generating_clips: Creating video clips from segments
 * - adding_subtitles: Burning subtitles into clips
 * - completed: All clips ready
 * - failed: Error occurred
 */
export type JobStatus =
  | 'queued'
  | 'downloading'
  | 'transcribing'
  | 'detecting_clips'
  | 'generating_clips'
  | 'adding_subtitles'
  | 'completed'
  | 'failed'

/** Optional processing settings from the frontend */
export interface JobSettings {
  aspect_ratio?: string
  clip_length?: string
  caption_style?: string
}

/**
 * Represents a video processing job
 */
export interface Job {
  id: string
  videoUrl: string
  status: JobStatus
  createdAt: Date
  updatedAt: Date
  /** Processing settings (aspect ratio, clip length, caption style) */
  settings?: JobSettings
  /** Error message when status is 'failed' */
  error?: string
  /** Clips produced by the AI worker (when status is 'completed') */
  clips?: Clip[]
}

/**
 * A single clip extracted from the video
 */
export interface Clip {
  id: string
  jobId: string
  /** URL or path to the clip file */
  url: string
  /** Start time in seconds */
  startTime: number
  /** End time in seconds */
  endTime: number
  /** Optional description from AI */
  description?: string
}

/**
 * In-memory store for jobs and clips.
 * Map structure: jobId -> Job
 */
const jobsStore = new Map<string, Job>()

/**
 * JobService - manages job lifecycle and in-memory storage
 */
export class JobService {
  /**
   * Generate a unique job ID using UUID v4
   */
  generateJobId(): string {
    return randomUUID()
  }

  /**
   * Create a new job and store it in memory
   */
  createJob(
    videoUrl: string,
    settings?: JobSettings
  ): Job {
    const id = this.generateJobId()
    const now = new Date()

    const job: Job = {
      id,
      videoUrl,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
      settings,
    }

    jobsStore.set(id, job)
    return job
  }

  /**
   * Get a job by ID
   */
  getJob(id: string): Job | undefined {
    return jobsStore.get(id)
  }

  /**
   * Update job status (called when worker updates progress)
   */
  updateJobStatus(
    id: string,
    status: JobStatus,
    options?: { error?: string; clips?: Clip[] }
  ): Job | undefined {
    const job = jobsStore.get(id)
    if (!job) return undefined

    job.status = status
    job.updatedAt = new Date()
    if (options?.error) job.error = options.error
    if (options?.clips) job.clips = options.clips

    jobsStore.set(id, job)
    return job
  }

  /**
   * Get all clips for a job
   */
  getClipsByJobId(jobId: string): Clip[] {
    const job = jobsStore.get(jobId)
    return job?.clips ?? []
  }
}

// Singleton instance - export for use in controllers and queue workers
export const jobService = new JobService()
