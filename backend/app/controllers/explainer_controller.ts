/*
|--------------------------------------------------------------------------
| Explainer Controller
|--------------------------------------------------------------------------
|
| POST /api/explainer - Create explainer job (queue for AI worker)
| GET  /api/explainer/:jobId - Get status and result
| POST /api/explainer/:jobId/complete - Worker callback (no auth)
|
*/

import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { explainerService } from '#services/explainer_service'
import { addExplainerJob } from '#queue'
import { randomUUID } from 'node:crypto'

const getBaseUrl = () =>
  (env.get('APP_URL') ?? 'http://localhost:3333').replace(/\/$/, '')

function resolveJobId(id: string): string {
  return id.startsWith('explainer_') ? id.slice(10) : id
}

export default class ExplainerController {
  /**
   * POST /api/explainer
   * Create explainer job, add to queue. Requires auth.
   */
  async create({ request, response, auth }: HttpContext) {
    auth.getUserOrFail()

    const body = request.body() as {
      clipUrl?: string
      style?: string
      voice?: string
      originalAudioVolume?: number
    }

    const clipUrl = body.clipUrl
    if (!clipUrl || typeof clipUrl !== 'string') {
      return response.status(400).json({
        success: false,
        error: 'clipUrl is required',
      })
    }

    const jobId = randomUUID()
    const payload = {
      job_id: jobId,
      clip_url: clipUrl,
      style: body.style ?? 'commentary',
      voice: body.voice ?? 'en-US-Neural2-J',
      original_audio_volume: body.originalAudioVolume ?? 0.2,
    }

    try {
      await addExplainerJob(jobId, payload)
      explainerService.setQueued(jobId)
      return response.json({
        success: true,
        job_id: jobId,
        status: 'queued',
      })
    } catch (err) {
      return response.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to queue explainer',
      })
    }
  }

  /**
   * GET /api/explainer/:jobId
   * Returns status, and when completed: url, script. Requires auth.
   */
  async show({ params, response, auth }: HttpContext) {
    auth.getUserOrFail()
    const jobId = String(params.jobId)
    const state = explainerService.getState(jobId)

    if (!state) {
      return response.status(404).json({
        success: false,
        error: 'Explainer job not found',
        job_id: jobId,
      })
    }

    let url = state.url
    if (url && !url.startsWith('http')) {
      url = `${getBaseUrl()}/storage/explainers/${url}`
    }

    return response.json({
      success: true,
      job_id: jobId,
      status: state.status,
      url: state.status === 'completed' ? url : undefined,
      script: state.status === 'completed' ? state.script : undefined,
      error: state.error,
    })
  }

  /**
   * POST /api/explainer/:jobId/complete
   * Called by AI worker when explainer is done. No auth.
   */
  async complete({ params, request, response }: HttpContext) {
    const jobId = resolveJobId(String(params.jobId))
    const body = request.body() as { url?: string; script?: string; error?: string }

    if (body.error) {
      explainerService.setFailed(jobId, body.error)
    } else if (body.url) {
      explainerService.setCompleted(jobId, body.url, body.script ?? '')
    } else {
      return response.status(400).json({
        success: false,
        error: 'url or error required',
      })
    }

    return response.json({
      success: true,
      job_id: jobId,
      status: body.error ? 'failed' : 'completed',
    })
  }
}
