/*
|--------------------------------------------------------------------------
| Render Controller
|--------------------------------------------------------------------------
|
| POST /api/job/:jobId/render - Queue render job, return render_id
| GET  /api/job/:jobId/render-status - Poll for status and download URL
| POST /api/job/:jobId/render-complete - Worker callback when render done
|
*/

import { basename } from 'node:path'
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { jobService } from '#services/job_service'
import { renderService } from '#services/render_service'
import { addRenderJob } from '#queue'

const getBaseUrl = () =>
  (env.get('APP_URL') ?? 'http://localhost:3333').replace(/\/$/, '')

/** Strip BullMQ render_ prefix from worker callback IDs */
function resolveJobId(id: string): string {
  return id.startsWith('render_') ? id.slice(7) : id
}

export default class RenderController {
  /**
   * POST /api/job/:jobId/render
   * Queue render job and return immediately. Requires auth, owner only.
   */
  async render({ params, request, response, auth }: HttpContext) {
    const jobId = params.jobId
    const user = auth.getUserOrFail()
    const job = await jobService.getJob(jobId, user.id)

    if (!job) {
      return response.status(404).json({
        success: false,
        error: 'Job not found',
        job_id: jobId,
      })
    }

    const body = request.body() as {
      clipUrl?: string
      captions?: Array<{
        start: number
        end: number
        text: string
        words?: Array<{ word: string; start: number; end: number }>
      }>
      style?: string
      position?: string
      fontSize?: string
      trimStart?: number
      trimEnd?: number
      textColor?: string
      backgroundColor?: string
      backgroundOpacity?: number
    }

    const clipUrl = body.clipUrl
    if (!clipUrl || typeof clipUrl !== 'string') {
      return response.status(400).json({
        success: false,
        error: 'clipUrl is required',
      })
    }

    const clips = job.clips ?? []
    const filename = basename(String(clipUrl).replace(/\\/g, '/'))
    const clip = clips.find((c) => {
      const cUrl = c.url || ''
      return cUrl.endsWith(filename) || cUrl.includes(filename)
    })

    if (!clip) {
      return response.status(404).json({
        success: false,
        error: 'Clip not found',
        clipUrl: filename,
      })
    }

    const captions = body.captions ?? []
    const payload = {
      job_id: jobId,
      clip_url: filename,
      captions,
      style: body.style ?? 'simple',
      position: body.position ?? 'bottom',
      fontSize: body.fontSize ?? 'medium',
      trimStart: body.trimStart ?? 0,
      trimEnd: body.trimEnd ?? 60,
      textColor: body.textColor ?? '#ffffff',
      backgroundColor: body.backgroundColor ?? '#facc15',
      backgroundOpacity: body.backgroundOpacity ?? 0.8,
    }

    try {
      await addRenderJob(payload)
      renderService.setRendering(jobId)
      return response.json({
        success: true,
        render_id: jobId,
        status: 'rendering',
      })
    } catch (err) {
      return response.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to queue render',
      })
    }
  }

  /**
   * GET /api/job/:jobId/render-status
   * Returns status and downloadUrl when completed. Requires auth, owner only.
   */
  async renderStatus({ params, response, auth }: HttpContext) {
    const jobId = params.jobId
    const user = auth.getUserOrFail()
    const job = await jobService.getJob(jobId, user.id)
    if (!job) {
      return response.status(404).json({
        success: false,
        error: 'Job not found',
        job_id: jobId,
      })
    }
    const state = renderService.getState(jobId)

    if (!state) {
      return response.json({
        success: true,
        status: 'idle',
        downloadUrl: null,
      })
    }

    const downloadUrl =
      state.downloadUrl && !state.downloadUrl.startsWith('http')
        ? `${getBaseUrl()}/storage/renders/${state.downloadUrl}`
        : state.downloadUrl

    return response.json({
      success: true,
      status: state.status,
      downloadUrl: state.status === 'completed' ? downloadUrl : null,
      error: state.error,
    })
  }

  /**
   * POST /api/job/:jobId/render-complete
   * Called by AI worker when rendering is done
   */
  async renderComplete({ params, request, response }: HttpContext) {
    const jobId = resolveJobId(String(params.jobId))
    const body = request.body() as { url?: string; error?: string }

    if (body.error) {
      renderService.setFailed(jobId, body.error)
    } else if (body.url) {
      renderService.setCompleted(jobId, body.url)
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
