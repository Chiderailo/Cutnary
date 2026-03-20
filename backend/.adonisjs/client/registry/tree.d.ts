/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  storage: {
    serveClip: typeof routes['storage.serve_clip']
    serveVideo: typeof routes['storage.serve_video']
    serveRender: typeof routes['storage.serve_render']
  }
  newAccount: {
    store: typeof routes['new_account.store']
  }
  accessToken: {
    store: typeof routes['access_token.store']
    destroy: typeof routes['access_token.destroy']
  }
  profile: {
    show: typeof routes['profile.show']
  }
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
  render: {
    render: typeof routes['render.render']
    renderStatus: typeof routes['render.render_status']
    renderComplete: typeof routes['render.render_complete']
  }
  transcript: {
    store: typeof routes['transcript.store']
    show: typeof routes['transcript.show']
    updateStatus: typeof routes['transcript.update_status']
    complete: typeof routes['transcript.complete']
  }
}
