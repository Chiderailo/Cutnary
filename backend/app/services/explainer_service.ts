/*
|--------------------------------------------------------------------------
| Explainer Service
|--------------------------------------------------------------------------
|
| Tracks AI voice explainer job status. When the AI worker finishes,
| it calls explainer complete and we store the download URL and script.
| The frontend polls explainer status until completed.
|
*/

export type ExplainerStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface ExplainerState {
  status: ExplainerStatus
  url?: string
  script?: string
  error?: string
}

const explainerStore = new Map<string, ExplainerState>()

export const explainerService = {
  setQueued(jobId: string): void {
    explainerStore.set(jobId, { status: 'queued' })
  },

  setProcessing(jobId: string): void {
    explainerStore.set(jobId, { status: 'processing' })
  },

  setCompleted(jobId: string, url: string, script: string): void {
    explainerStore.set(jobId, { status: 'completed', url, script })
  },

  setFailed(jobId: string, error: string): void {
    explainerStore.set(jobId, { status: 'failed', error })
  },

  getState(jobId: string): ExplainerState | undefined {
    return explainerStore.get(jobId)
  },
}
