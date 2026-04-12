/*
|--------------------------------------------------------------------------
| Notification Service
|--------------------------------------------------------------------------
*/

import Notification from '#models/notification'

export type NotificationType =
  | 'post_success'
  | 'post_failed'
  | 'posts_scheduled'
  | 'clips_ready'

const MESSAGES: Record<NotificationType, (ctx?: Record<string, string>) => string> = {
  post_success: (ctx) => `✅ Clip posted to ${ctx?.platform ?? 'social'} successfully`,
  post_failed: (ctx) => `❌ Failed to post to ${ctx?.platform ?? 'platform'}${ctx?.error ? ` - ${ctx.error}` : ''}`,
  posts_scheduled: (ctx) => `⏰ ${ctx?.count ?? 'Clips'} scheduled for posting`,
  clips_ready: () => '🎬 Your clips are ready to view',
}

export async function createNotification(
  userId: number,
  type: NotificationType,
  context?: Record<string, string>
): Promise<Notification> {
  const message = MESSAGES[type](context)
  return Notification.create({
    userId,
    type,
    message,
    read: false,
  })
}

export async function getUnreadCount(userId: number): Promise<number> {
  const rows = await Notification.query().where('user_id', userId).where('read', false)
  return rows.length
}

export async function getNotifications(userId: number, limit = 50) {
  return Notification.query()
    .where('user_id', userId)
    .orderBy('created_at', 'desc')
    .limit(limit)
}

export async function markAsRead(notificationId: number, userId: number): Promise<boolean> {
  const n = await Notification.query()
    .where('id', notificationId)
    .where('user_id', userId)
    .first()
  if (n) {
    n.read = true
    await n.save()
    return true
  }
  return false
}

/** Marks every unread notification for the user as read. Returns how many rows were updated. */
export async function markAllAsRead(userId: number): Promise<number> {
  const unread = await Notification.query().where('user_id', userId).where('read', false)
  for (const n of unread) {
    n.read = true
    await n.save()
  }
  return unread.length
}
