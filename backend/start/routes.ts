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

// Health check / root
router.get('/', () => {
  return { hello: 'cutnary', version: '1.0' }
})

// Video processing API routes
registerApiRoutes()
