/*
|--------------------------------------------------------------------------
| Transcript Service
|--------------------------------------------------------------------------
|
| Tracks transcript job status. When the AI worker finishes, it calls
| transcript-complete and we store the segments.
|
*/

export type TranscriptStatus = 'queued' | 'downloading' | 'transcribing' | 'completed' | 'failed'

export interface TranscriptWord {
  word: string
  start: number
  end: number
  speaker?: string
}

export interface TranscriptSegment {
  speaker: string
  start: number
  end: number
  text: string
  words: TranscriptWord[]
}

export interface TranscriptState {
  status: TranscriptStatus
  segments?: TranscriptSegment[]
  videoUrl?: string
  videoTitle?: string
  speakerSeparation?: boolean
  error?: string
}

const transcriptStore = new Map<string, TranscriptState>()

export const transcriptService = {
  setQueued(jobId: string): void {
    transcriptStore.set(jobId, { status: 'queued' })
  },

  setStatus(jobId: string, status: TranscriptStatus, error?: string): void {
    const current = transcriptStore.get(jobId) ?? { status: 'queued' }
    transcriptStore.set(jobId, { ...current, status, error })
  },

  setCompleted(
    jobId: string,
    segments: TranscriptSegment[],
    videoUrl: string,
    videoTitle: string,
    speakerSeparation?: boolean
  ): void {
    transcriptStore.set(jobId, {
      status: 'completed',
      segments,
      videoUrl,
      videoTitle,
      speakerSeparation,
    })
  },

  setFailed(jobId: string, error: string): void {
    transcriptStore.set(jobId, { status: 'failed', error })
  },

  getState(jobId: string): TranscriptState | undefined {
    return transcriptStore.get(jobId)
  },
}
