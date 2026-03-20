/*
|--------------------------------------------------------------------------
| Render Service
|--------------------------------------------------------------------------
|
| Tracks render job status. When the AI worker finishes, it calls
| render-complete and we store the download URL. The frontend polls
| render-status until status is "completed".
|
*/

export type RenderStatus = 'rendering' | 'completed' | 'failed'

export interface RenderState {
  status: RenderStatus
  downloadUrl?: string
  error?: string
}

const renderStore = new Map<string, RenderState>()

export const renderService = {
  setRendering(jobId: string): void {
    renderStore.set(jobId, { status: 'rendering' })
  },

  setCompleted(jobId: string, downloadUrl: string): void {
    renderStore.set(jobId, { status: 'completed', downloadUrl })
  },

  setFailed(jobId: string, error: string): void {
    renderStore.set(jobId, { status: 'failed', error })
  },

  getState(jobId: string): RenderState | undefined {
    return renderStore.get(jobId)
  },
}
