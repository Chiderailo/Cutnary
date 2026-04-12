/*
|--------------------------------------------------------------------------
| Notifications Controller
|--------------------------------------------------------------------------
*/

import type { HttpContext } from '@adonisjs/core/http'
import {
  getNotifications,
  markAllAsRead as markAllReadService,
  markAsRead as markReadService,
} from '#services/notification_service'

export default class NotificationsController {
  /**
   * GET /api/notifications
   */
  async index({ response, auth }: HttpContext) {
    auth.getUserOrFail()
    const list = await getNotifications(auth.user!.id)
    return response.json({
      success: true,
      notifications: list.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt?.toISO(),
      })),
    })
  }

  /**
   * POST /api/notifications/:id/read
   */
  async markRead({ params, response, auth }: HttpContext) {
    auth.getUserOrFail()
    const id = Number(params.id)
    if (!Number.isFinite(id)) {
      return response.status(400).json({ success: false, error: 'Invalid ID' })
    }
    const ok = await markReadService(id, auth.user!.id)
    return response.json({ success: ok })
  }

  /**
   * POST /api/notifications/read-all
   */
  async markAllRead({ response, auth }: HttpContext) {
    auth.getUserOrFail()
    const updated = await markAllReadService(auth.user!.id)
    return response.json({ success: true, updated })
  }
}
