/*
|--------------------------------------------------------------------------
| Social Controller
|--------------------------------------------------------------------------
| OAuth connect, accounts, post, post status
*/

import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import SocialAccount from '#models/social_account'
import {
  getOAuthUrl,
  getAccountsForUser,
  disconnectAccount,
  getPostStatus,
  getPostsForUser,
  postToPlatform,
  processScheduledPosts,
  getPendingPages,
  selectPageFromPending,
  type Platform,
} from '#services/social_service'
import { getConfiguredPlatforms } from '#services/credentials_service'

export default class SocialController {
  async platformStatus({ response, auth }: HttpContext) {
    auth.getUserOrFail()
    const platforms = await getConfiguredPlatforms()
    return response.json(platforms)
  }

  /**
   * POST /api/social/connect
   * Returns OAuth URL for the given platform. Frontend redirects user there.
   */
  async connect({ request, response, auth }: HttpContext) {
    auth.getUserOrFail()
    const platform = request.input('platform') as Platform
    if (!['youtube', 'tiktok', 'instagram', 'facebook'].includes(platform)) {
      return response.status(400).json({ success: false, error: 'Invalid platform' })
    }
    try {
      const url = await getOAuthUrl(platform, auth.user!.id)
      return response.json({ success: true, url })
    } catch (e) {
      return response.status(400).json({
        success: false,
        error: e instanceof Error ? e.message : 'OAuth not configured',
      })
    }
  }

  /**
   * GET /api/social/accounts
   * List user's connected social accounts.
   */
  async accounts({ response, auth }: HttpContext) {
    auth.getUserOrFail()
    const accounts = await getAccountsForUser(auth.user!.id)
    return response.json({
      success: true,
      accounts: accounts.map((a) => ({
        id: a.id,
        platform: a.platform,
        accountId: a.accountId,
        accountName: a.accountName,
        profilePictureUrl: a.profilePictureUrl,
        followerCount: a.followerCount,
      })),
    })
  }

  /**
   * DELETE /api/social/accounts/:id
   * Disconnect an account.
   */
  async disconnectAccount({ params, response, auth }: HttpContext) {
    auth.getUserOrFail()
    const id = Number(params.id)
    if (!Number.isFinite(id)) {
      return response.status(400).json({ success: false, error: 'Invalid ID' })
    }
    await disconnectAccount(auth.user!.id, id)
    return response.json({ success: true })
  }

  /**
   * POST /api/social/post
   * Post clip to selected platforms.
   */
  async post({ request, response, auth }: HttpContext) {
    auth.getUserOrFail()
    const body = request.body() as {
      clip_url?: string
      platforms?: string[]
      title?: string
      description?: string
      hashtags?: string[]
      schedule_time?: string | null
      thumbnail_url?: string
    }
    const clipUrl = body.clip_url
    if (!clipUrl || typeof clipUrl !== 'string') {
      return response.status(400).json({ success: false, error: 'clip_url required' })
    }
    const platforms = (body.platforms ?? []) as Platform[]
    if (platforms.length === 0) {
      return response.status(400).json({ success: false, error: 'At least one platform required' })
    }
    const title = body.title ?? 'Check this out!'
    const description = body.description ?? ''
    const tags = body.hashtags ?? ['viral', 'trending', 'fyp', 'reels', 'shorts']
    const scheduleTime = body.schedule_time as string | null | undefined
    const thumbnailUrl = body.thumbnail_url as string | undefined

    const accounts = await SocialAccount.query()
      .where('user_id', auth.user!.id)
      .whereIn('platform', platforms)

    const results: Array<{ platform: string; postId?: number; error?: string }> = []

    for (const platform of platforms) {
      const account = accounts.find((a) => a.platform === platform)
      if (!account) {
        results.push({ platform, error: `Account not connected for ${platform}` })
        continue
      }

      const SocialPost = (await import('#models/social_post')).default
      const scheduledAt = scheduleTime ? DateTime.fromISO(scheduleTime) : null
      const post = await SocialPost.create({
        userId: auth.user!.id,
        clipUrl,
        thumbnailUrl: thumbnailUrl ?? null,
        platform,
        status: scheduleTime ? 'scheduled' : 'posting',
        caption: description,
        hashtags: tags,
        scheduledAt,
      })

      if (scheduleTime) {
        const { createNotification } = await import('#services/notification_service')
        await createNotification(auth.user!.id, 'posts_scheduled', { count: '1' })
        results.push({ platform, postId: post.id })
        continue
      }

      try {
        let accessToken = account.accessToken
        try {
          const { ensureValidToken } = await import('#services/token_refresh_service')
          accessToken = await ensureValidToken(account)
        } catch {
          // Continue with current token
        }
        const extra: { instagramAccountId?: string; pageId?: string } = {}
        if (platform === 'instagram') extra.instagramAccountId = account.accountId ?? undefined
        if (platform === 'facebook') extra.pageId = account.accountId ?? undefined

        const result = await postToPlatform(
          platform,
          clipUrl,
          title,
          description,
          tags,
          accessToken,
          extra
        )

        post.externalId = result.externalId ?? null
        post.externalUrl = result.externalUrl ?? null
        post.status = 'published'
        post.postedAt = DateTime.now()
        await post.save()
        const { createNotification } = await import('#services/notification_service')
        await createNotification(auth.user!.id, 'post_success', { platform })
        results.push({ platform, postId: post.id })
      } catch (e) {
        post.status = 'failed'
        post.error = e instanceof Error ? e.message : 'Unknown error'
        await post.save()
        const { createNotification } = await import('#services/notification_service')
        await createNotification(auth.user!.id, 'post_failed', {
          platform,
          error: post.error ?? '',
        })
        results.push({ platform, postId: post.id, error: post.error })
      }
    }

    return response.json({ success: true, results })
  }

  /**
   * GET /api/social/post/:id/status
   * Get status of a post.
   */
  async postStatus({ params, response, auth }: HttpContext) {
    auth.getUserOrFail()
    const id = Number(params.id)
    if (!Number.isFinite(id)) {
      return response.status(400).json({ success: false, error: 'Invalid ID' })
    }
    const post = await getPostStatus(id, auth.user!.id)
    if (!post) {
      return response.status(404).json({ success: false, error: 'Post not found' })
    }
    return response.json({
      success: true,
      post: {
        id: post.id,
        platform: post.platform,
        clipUrl: post.clipUrl,
        status: post.status,
        externalId: post.externalId,
        externalUrl: post.externalUrl,
        error: post.error,
        views: post.views,
        likes: post.likes,
        comments: post.comments,
        postedAt: post.postedAt?.toISO(),
      },
    })
  }

  /**
   * GET /api/social/posts
   * List user's post history.
   */
  async posts({ response, auth }: HttpContext) {
    auth.getUserOrFail()
    const posts = await getPostsForUser(auth.user!.id)
    return response.json({
      success: true,
      posts: posts.map((p) => ({
        id: p.id,
        platform: p.platform,
        clipUrl: p.clipUrl,
        thumbnailUrl: p.thumbnailUrl,
        caption: p.caption,
        hashtags: p.hashtags,
        status: p.status,
        externalUrl: p.externalUrl,
        error: p.error,
        views: p.views,
        likes: p.likes,
        comments: p.comments,
        scheduledAt: p.scheduledAt?.toISO(),
        postedAt: p.postedAt?.toISO(),
        createdAt: p.createdAt?.toISO(),
      })),
    })
  }

  /**
   * POST /api/social/campaign
   * Create a posting campaign with multiple clips, optionally with smart delay.
   */
  async campaign({ request, response, auth }: HttpContext) {
    auth.getUserOrFail()
    const body = request.body() as {
      clips?: Array<{
        clip_url: string
        thumbnail_url?: string
        caption?: string
        hashtags?: string[]
        platforms?: string[]
        scheduled_at?: string
      }>
      smart_delay?: boolean
      delay_minutes?: number
      start_time?: string
    }
    const clips = body.clips ?? []
    const smartDelay = body.smart_delay === true
    const delayMinutes = Math.max(1, Math.min(60, body.delay_minutes ?? 1))
    const startTime = body.start_time ? DateTime.fromISO(body.start_time) : DateTime.now()

    if (clips.length === 0) {
      return response.status(400).json({ success: false, error: 'At least one clip required' })
    }

    const SocialPost = (await import('#models/social_post')).default
    let baseTime = startTime
    const created: number[] = []

    for (let i = 0; i < clips.length; i++) {
      const c = clips[i]
      const clipUrl = c.clip_url
      const platforms = (c.platforms ?? []) as Platform[]
      const caption = c.caption ?? 'Check this out!'
      const hashtags = c.hashtags ?? ['viral', 'trending', 'fyp', 'reels', 'shorts']
      const thumbnailUrl = c.thumbnail_url ?? null

      const scheduledAt = c.scheduled_at
        ? DateTime.fromISO(c.scheduled_at)
        : smartDelay
          ? baseTime.plus({ minutes: i * delayMinutes })
          : baseTime.plus({ minutes: i })

      if (i === 0 && smartDelay) baseTime = scheduledAt

      for (const platform of platforms) {
        const post = await SocialPost.create({
          userId: auth.user!.id,
          clipUrl,
          thumbnailUrl,
          platform,
          caption,
          hashtags,
          status: 'scheduled',
          scheduledAt,
        })
        created.push(post.id)
      }
    }

    const { createNotification } = await import('#services/notification_service')
    await createNotification(auth.user!.id, 'posts_scheduled', {
      count: String(created.length),
    })

    return response.json({
      success: true,
      created,
      message: `${created.length} posts scheduled. They will be published automatically.`,
    })
  }

  /**
   * GET /api/social/scheduled
   * List user's scheduled posts.
   */
  async scheduled({ response, auth }: HttpContext) {
    auth.getUserOrFail()
    const SocialPost = (await import('#models/social_post')).default
    const posts = await SocialPost.query()
      .where('user_id', auth.user!.id)
      .where('status', 'scheduled')
      .whereNotNull('scheduled_at')
      .orderBy('scheduled_at', 'asc')

    return response.json({
      success: true,
      posts: posts.map((p) => ({
        id: p.id,
        platform: p.platform,
        clipUrl: p.clipUrl,
        thumbnailUrl: p.thumbnailUrl,
        caption: p.caption,
        hashtags: p.hashtags,
        scheduledAt: p.scheduledAt?.toISO(),
        createdAt: p.createdAt?.toISO(),
      })),
    })
  }

  /**
   * POST /api/social/process-scheduled
   * Process due scheduled posts (called by cron or manually).
   */
  async processScheduled({ response, auth }: HttpContext) {
    auth.getUserOrFail()
    console.log(`[SCHEDULER] Manual run requested by user ${auth.user!.id}`)
    const processed = await processScheduledPosts()
    return response.json({ success: true, processed, ranAt: DateTime.now().toISO() })
  }

  async schedulerRun(ctx: HttpContext) {
    return this.processScheduled(ctx)
  }

  /**
   * GET /api/social/facebook/pending-pages?id=...
   * Get Facebook pages for pending selection (after OAuth with multiple pages).
   */
  async facebookPendingPages({ request, response, auth }: HttpContext) {
    auth.getUserOrFail()
    const id = Number(request.input('id'))
    if (!Number.isFinite(id)) {
      return response.status(400).json({ success: false, error: 'Invalid id' })
    }
    const pages = await getPendingPages(auth.user!.id, id)
    if (!pages) {
      return response.status(404).json({ success: false, error: 'Pending selection not found or expired' })
    }
    return response.json({
      success: true,
      pages: pages.map((p) => ({
        id: p.id,
        name: p.name,
        picture: p.picture?.data?.url ?? null,
      })),
    })
  }

  /**
   * POST /api/social/facebook/select-page
   * Select a Facebook page and create social account. Body: { pending_id, page_id }
   */
  async facebookSelectPage({ request, response, auth }: HttpContext) {
    auth.getUserOrFail()
    const body = request.body() as { pending_id?: number; page_id?: string }
    const pendingId = Number(body.pending_id)
    const pageId = body.page_id
    if (!Number.isFinite(pendingId) || !pageId || typeof pageId !== 'string') {
      return response.status(400).json({ success: false, error: 'pending_id and page_id required' })
    }
    try {
      await selectPageFromPending(auth.user!.id, pendingId, pageId)
      return response.json({ success: true })
    } catch (e) {
      return response.status(400).json({
        success: false,
        error: e instanceof Error ? e.message : 'Failed to select page',
      })
    }
  }

  /**
   * POST /api/social/post/:id/retry
   * Retry a failed post.
   */
  async retryPost({ params, response, auth }: HttpContext) {
    auth.getUserOrFail()
    const id = Number(params.id)
    if (!Number.isFinite(id)) {
      return response.status(400).json({ success: false, error: 'Invalid ID' })
    }
    const SocialPost = (await import('#models/social_post')).default
    const post = await SocialPost.query()
      .where('id', id)
      .where('user_id', auth.user!.id)
      .first()
    if (!post) {
      return response.status(404).json({ success: false, error: 'Post not found' })
    }
    if (post.status !== 'failed') {
      return response.status(400).json({ success: false, error: 'Can only retry failed posts' })
    }
    const account = await SocialAccount.query()
      .where('user_id', auth.user!.id)
      .where('platform', post.platform)
      .first()
    if (!account) {
      return response.status(400).json({ success: false, error: `Account not connected for ${post.platform}` })
    }
    post.status = 'posting'
    post.error = null
    await post.save()
    try {
      let accessToken = account.accessToken
      try {
        const { ensureValidToken } = await import('#services/token_refresh_service')
        accessToken = await ensureValidToken(account)
      } catch {
        // Continue with current token
      }
      const extra: { instagramAccountId?: string; pageId?: string } = {}
      if (post.platform === 'instagram') extra.instagramAccountId = account.accountId ?? undefined
      if (post.platform === 'facebook') extra.pageId = account.accountId ?? undefined
      const result = await postToPlatform(
        post.platform as Platform,
        post.clipUrl,
        (post.caption ?? 'Check this out!').slice(0, 100),
        post.caption ?? '',
        post.hashtags ?? ['viral', 'trending', 'fyp'],
        accessToken,
        extra
      )
      post.externalId = result.externalId ?? null
      post.externalUrl = result.externalUrl ?? null
      post.status = 'published'
      post.postedAt = DateTime.now()
      await post.save()
      const { createNotification } = await import('#services/notification_service')
      await createNotification(auth.user!.id, 'post_success', { platform: post.platform })
      return response.json({ success: true })
    } catch (e) {
      post.status = 'failed'
      post.error = e instanceof Error ? e.message : 'Unknown error'
      await post.save()
      const { createNotification } = await import('#services/notification_service')
      await createNotification(auth.user!.id, 'post_failed', {
        platform: post.platform,
        error: post.error ?? '',
      })
      return response.status(500).json({ success: false, error: post.error })
    }
  }
}
