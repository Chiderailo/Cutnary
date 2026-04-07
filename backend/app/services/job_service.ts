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
  thumbnailUrl?: string
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

    const job = new Job()
    job.id = id
    job.userId = userId ?? null
    job.videoUrl = videoUrl
    job.status = 'queued'
    job.aspectRatio = settings?.aspect_ratio ?? '9:16'
    job.clipLength = settings?.clip_length ?? 'auto'
    await job.save()

    console.log('Created job with id:', job.id, 'type:', typeof job.id)

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
        const wordsCount = Array.isArray(c.words) ? c.words.length : 0
        // Keep Whisper word timings so the frontend editor can render correct synced captions.
        console.log('Saving clip words for job:', id, 'clip url:', c.url, 'wordsCount:', wordsCount)
        await Clip.create({
          jobId: id,
          url: c.url,
          score: c.score ?? null,
          description: c.description ?? null,
          duration: c.startTime != null && c.endTime != null ? c.endTime - c.startTime : null,
          startTime: c.startTime ?? null,
          endTime: c.endTime ?? null,
          viralDescription: c.viralDescription ?? null,
          words: c.words ?? null,
          thumbnailUrl: c.thumbnailUrl ?? null,
        })
      }
    }

    return this.getJob(id)
  }

  async getClipsByJobId(jobId: string): Promise<ClipData[]> {
    console.log('JobService.getClipsByJobId for job:', jobId)
    const clips = await Clip.query().where('job_id', jobId)
    return clips.map((c) => ({
      id: String(c.id),
      jobId: String(c.jobId),
      url: c.url,
      startTime: c.startTime ?? undefined,
      endTime: c.endTime ?? undefined,
      description: c.description ?? undefined,
      viralDescription: c.viralDescription ?? undefined,
      score: c.score ?? undefined,
      words: c.words ?? undefined,
      thumbnailUrl: c.thumbnailUrl ?? undefined,
    }))
  }

  private async toJobData(job: Job): Promise<JobData> {
    const clips = await job.related('clips').query()
    return {
      id: String(job.id),
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
        jobId: String(c.jobId),
        url: c.url,
        startTime: c.startTime ?? undefined,
        endTime: c.endTime ?? undefined,
        description: c.description ?? undefined,
        viralDescription: c.viralDescription ?? undefined,
        score: c.score ?? undefined,
        words: c.words ?? undefined,
        thumbnailUrl: c.thumbnailUrl ?? undefined,
      })),
    }
  }
}

export const jobService = new JobService()
