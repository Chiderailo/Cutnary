/*
|--------------------------------------------------------------------------
| Transcript Controller
|--------------------------------------------------------------------------
|
| POST /api/transcript - Create transcript job
| GET  /api/transcript/:jobId - Get transcript status/result
| POST /api/transcript/:jobId/status - Worker status update
| POST /api/transcript/:jobId/complete - Worker completion
|
*/

import { randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import { transcriptService } from '#services/transcript_service'
import { addTranscriptJob } from '#queue'

/** Strip BullMQ transcript_ prefix from worker callback IDs */
function resolveJobId(id: string): string {
  return id.startsWith('transcript_') ? id.slice(11) : id
}

export default class TranscriptController {
  /**
   * POST /api/transcript
   * Body: { video_url, language, speaker_separation }
   */
  async store({ request, response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const body = request.body() as {
      video_url?: string
      language?: string
      speaker_separation?: boolean
      video_title?: string
    }

    const videoUrl = body.video_url
    if (!videoUrl || typeof videoUrl !== 'string') {
      return response.status(400).json({
        success: false,
        error: 'video_url is required',
      })
    }

    const jobId = randomUUID()
    const language = body.language ?? 'en'
    const speakerSeparation = body.speaker_separation !== false && body.speaker_separation !== 'false'
    const videoTitle = body.video_title ?? 'Untitled'

    console.log('speaker_separation:', speakerSeparation, '(from body:', body.speaker_separation, ')')

    try {
      await addTranscriptJob(jobId, {
        video_url: videoUrl,
        language,
        speaker_separation: speakerSeparation,
        video_title: videoTitle,
      })
      transcriptService.setQueued(jobId)
      return response.status(202).json({
        success: true,
        job_id: jobId,
        status: 'queued',
        message: 'Transcript job queued',
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Queue error'
      const isRedis = /redis|ECONNREFUSED|connect/i.test(msg)
      return response.status(isRedis ? 503 : 500).json({
        success: false,
        error: isRedis ? 'Queue unavailable. Is Redis running?' : msg,
      })
    }
  }

  /**
   * GET /api/transcript/:jobId
   */
  async show({ params, response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const jobId = resolveJobId(String(params.jobId))
    const state = transcriptService.getState(jobId)

    if (!state) {
      return response.status(404).json({
        success: false,
        error: 'Transcript not found',
        job_id: jobId,
      })
    }

    return response.json({
      success: true,
      job_id: jobId,
      status: state.status,
      segments: state.segments,
      video_url: state.videoUrl,
      video_title: state.videoTitle,
      speaker_separation: state.speakerSeparation,
      note: state.note,
      error: state.error,
    })
  }

  /**
   * POST /api/transcript/:jobId/status - Worker callback
   */
  async updateStatus({ params, request, response }: HttpContext) {
    const jobId = resolveJobId(String(params.jobId))
    const body = request.body() as { status?: string; error?: string }
    const status = body.status as 'queued' | 'downloading' | 'transcribing' | 'completed' | 'failed'
    transcriptService.setStatus(jobId, status ?? 'queued', body.error)
    return response.json({ success: true, job_id: jobId, status })
  }

  /**
   * POST /api/transcript/:jobId/complete - Worker callback
   */
  async complete({ params, request, response }: HttpContext) {
    const jobId = resolveJobId(String(params.jobId))
    const body = request.body() as {
      status?: string
      error?: string
      segments?: Array<{
        speaker: string
        start: number
        end: number
        text: string
        words: Array<{ word: string; start: number; end: number; speaker?: string }>
      }>
      video_url?: string
      video_title?: string
      speaker_separation?: boolean
      note?: string
    }

    if (body.status === 'failed' || body.error) {
      transcriptService.setFailed(jobId, body.error ?? 'Unknown error')
    } else if (body.segments) {
      transcriptService.setCompleted(
        jobId,
        body.segments,
        body.video_url ?? '',
        body.video_title ?? 'Untitled',
        body.speaker_separation,
        body.note
      )
    }

    return response.json({
      success: true,
      job_id: jobId,
      status: 'completed',
    })
  }
}
