/*
|--------------------------------------------------------------------------
| Storage Controller
|--------------------------------------------------------------------------
|
| Serves clip and video files from the storage directory.
| Clips are stored by the AI worker, videos are downloaded files.
|
*/

import { createReadStream, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'

export default class StorageController {
  async serveClip({ params, response }: HttpContext) {
    const storagePath = env.get('STORAGE_PATH') ?? join(process.cwd(), '..', 'storage')
    const filePath = join(storagePath, 'clips', params.filename)
    console.log('Serving file from:', filePath)
    if (!existsSync(filePath)) return response.status(404).send('Not found')
    response.header('Content-Type', 'video/mp4')
    response.header('Accept-Ranges', 'bytes')
    return response.stream(createReadStream(filePath))
  }

  async serveVideo({ params, response }: HttpContext) {
    const storagePath = env.get('STORAGE_PATH') ?? join(process.cwd(), '..', 'storage')
    const filePath = join(storagePath, 'videos', params.filename)
    console.log('Serving file from:', filePath)
    if (!existsSync(filePath)) return response.status(404).send('Not found')
    response.header('Content-Type', 'video/mp4')
    response.header('Accept-Ranges', 'bytes')
    return response.stream(createReadStream(filePath))
  }

  async serveRender({ params, response }: HttpContext) {
    const storagePath = env.get('STORAGE_PATH') ?? join(process.cwd(), '..', 'storage')
    const filePath = join(storagePath, 'renders', params.filename)
    if (!existsSync(filePath)) return response.status(404).send('Not found')
    response.header('Content-Type', 'video/mp4')
    response.header('Accept-Ranges', 'bytes')
    return response.stream(createReadStream(filePath))
  }
}
