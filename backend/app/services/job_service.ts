/*
|--------------------------------------------------------------------------
| Job Service
|--------------------------------------------------------------------------
|
| Manages video processing jobs in the database.
| Jobs are tied to users. Worker callbacks (status, complete) update jobs
| without auth. Protected routes (GET job, GET clips) verify ownership.
|
*/

import { randomUUID } from 'node:crypto'
import Job from '#models/job'
import Clip from '#models/clip'
import type { JobStatus } from '#models/job'

export type { JobStatus }

export interface JobSettings {
  aspect_ratio?: string
  clip_length?: string
  caption_style?: string
  language?: string
}

export interface ClipWord {
  word: string
  start: number
  end: number
}

export interface ClipData {
  id: string
  jobId: string
  url: string
  startTime?: number
  endTime?: number
  description?: string
  viralDescription?: string
  score?: number
  words?: ClipWord[]
}

export interface JobData {
  id: string
  videoUrl: string
  status: JobStatus
  createdAt: Date
  updatedAt: Date
  userId?: number | null
  settings?: JobSettings
  error?: string
  clips?: ClipData[]
}

/**
 * JobService - manages job lifecycle in the database
 */
export class JobService {
  generateJobId(): string {
    return randomUUID()
  }

  async createJob(
    videoUrl: string,
    settings?: JobSettings,
    userId?: number | null
  ): Promise<JobData> {
    const id = this.generateJobId()
    const job = await Job.create({
      id,
      userId: userId ?? null,
      videoUrl,
      status: 'queued',
      aspectRatio: settings?.aspect_ratio ?? '9:16',
      clipLength: settings?.clip_length ?? 'auto',
    })
    return this.toJobData(job)
  }

  async getJob(id: string, forUserId?: number): Promise<JobData | null> {
    const job = await Job.find(id)
    if (!job) return null
    if (forUserId != null && job.userId !== forUserId) return null
    return this.toJobData(job)
  }

  async getJobForWorker(id: string): Promise<Job | null> {
    return Job.find(id)
  }

  async updateJobStatus(
    id: string,
    status: JobStatus,
    options?: { error?: string; clips?: ClipData[] }
  ): Promise<JobData | null> {
    const job = await Job.find(id)
    if (!job) return null

    job.status = status
    if (options?.error) job.error = options.error
    await job.save()

    if (options?.clips?.length) {
      await Clip.query().where('job_id', id).delete()
      for (const c of options.clips) {
        await Clip.create({
          jobId: id,
          url: c.url,
          score: c.score ?? null,
          description: c.description ?? null,
          duration: c.startTime != null && c.endTime != null ? c.endTime - c.startTime : null,
          startTime: c.startTime ?? null,
          endTime: c.endTime ?? null,
          viralDescription: c.viralDescription ?? null,
        })
      }
    }

    return this.getJob(id)
  }

  async getClipsByJobId(jobId: string): Promise<ClipData[]> {
    const clips = await Clip.query().where('job_id', jobId)
    return clips.map((c) => ({
      id: String(c.id),
      jobId: c.jobId,
      url: c.url,
      startTime: c.startTime ?? undefined,
      endTime: c.endTime ?? undefined,
      description: c.description ?? undefined,
      viralDescription: c.viralDescription ?? undefined,
      score: c.score ?? undefined,
      words: c.words ?? undefined,
    }))
  }

  private async toJobData(job: Job): Promise<JobData> {
    const clips = await job.related('clips').query()
    return {
      id: job.id,
      videoUrl: job.videoUrl,
      status: job.status,
      createdAt: job.createdAt.toJSDate(),
      updatedAt: job.updatedAt?.toJSDate() ?? job.createdAt.toJSDate(),
      userId: job.userId,
      settings: {
        aspect_ratio: job.aspectRatio ?? undefined,
        clip_length: job.clipLength ?? undefined,
      },
      error: job.error ?? undefined,
      clips: clips.map((c) => ({
        id: String(c.id),
        jobId: c.jobId,
        url: c.url,
        startTime: c.startTime ?? undefined,
        endTime: c.endTime ?? undefined,
        description: c.description ?? undefined,
        viralDescription: c.viralDescription ?? undefined,
        score: c.score ?? undefined,
        words: c.words ?? undefined,
      })),
    }
  }
}

export const jobService = new JobService()
