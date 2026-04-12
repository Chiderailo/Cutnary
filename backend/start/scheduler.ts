/*
|--------------------------------------------------------------------------
| Scheduled Posts Processor
|--------------------------------------------------------------------------
| Runs every 60 seconds to process due scheduled posts.
*/

import { processScheduledPosts } from '#services/social_service'

const INTERVAL_MS = 60 * 1000

let intervalId: ReturnType<typeof setInterval> | null = null

export function startScheduledPostsProcessor() {
  if (intervalId) return
  console.log('[SCHEDULER] Starting posting scheduler...')

  // Run once immediately on startup
  processScheduledPosts()
    .then((processed) => {
      console.log(`[SCHEDULER] Startup run complete. processed=${processed}`)
    })
    .catch((e) => {
      console.error('[SCHEDULER] Startup run failed:', e)
    })

  intervalId = setInterval(async () => {
    try {
      console.log('[SCHEDULER] Checking for scheduled posts...')
      await processScheduledPosts()
    } catch (e) {
      console.error('[SCHEDULER] processScheduledPosts failed:', e)
    }
  }, INTERVAL_MS)
  console.log('[SCHEDULER] Started scheduled posts processor (every 60s)')
}

export function stopScheduledPostsProcessor() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    console.log('[scheduler] Stopped scheduled posts processor')
  }
}
