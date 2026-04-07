/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
| API routes are registered from routes.ts for video processing.
|
*/

import router from '@adonisjs/core/services/router'
import { registerApiRoutes } from '#routes'
import StorageController from '#controllers/storage_controller'
import { startScheduledPostsProcessor } from './scheduler.js'

// Health check / root
router.get('/', () => {
  return { hello: 'cutnary', version: '1.0' }
})

// Storage – serve clip, video, and rendered files
router.get('/storage/clips/:filename', [StorageController, 'serveClip'])
router.get('/storage/videos/:filename', [StorageController, 'serveVideo'])
router.get('/storage/renders/:filename', [StorageController, 'serveRender'])
router.get('/storage/thumbnails/:filename', [StorageController, 'serveThumbnail'])
router.get('/storage/explainers/:filename', [StorageController, 'serveExplainer'])

// Video processing API routes
registerApiRoutes()

// Start scheduled posts processor (runs every 60s)
startScheduledPostsProcessor()
