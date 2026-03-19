/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  processVideo: {
    store: typeof routes['process_video.store']
  }
  job: {
    show: typeof routes['job.show']
    updateStatus: typeof routes['job.update_status']
    complete: typeof routes['job.complete']
  }
  clips: {
    index: typeof routes['clips.index']
  }
}
