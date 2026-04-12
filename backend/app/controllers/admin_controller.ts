import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import User from '#models/user'
import Job from '#models/job'
import Clip from '#models/clip'
import SocialAccount from '#models/social_account'
import SocialPost from '#models/social_post'
import PlatformCredential from '#models/platform_credential'
import { getConfiguredPlatforms } from '#services/credentials_service'

const PLATFORMS = ['youtube', 'tiktok', 'instagram', 'facebook'] as const

async function estimateStorageUsedBytes(): Promise<number> {
  const clips = await Clip.query().select(['url']).limit(2000)
  let total = 0
  for (const clip of clips) {
    try {
      const filename = clip.url.split('/').pop()
      if (!filename) continue
      const filePath = join(process.cwd(), '..', 'storage', 'clips', filename)
      const fileStat = await stat(filePath)
      total += fileStat.size
    } catch {
      // Ignore missing files
    }
  }
  return total
}

export default class AdminController {
  async stats({ response }: HttpContext) {
    const startOfDay = DateTime.now().startOf('day')
    const totalUsers = await User.query().count('* as total')
    const totalJobs = await Job.query().count('* as total')
    const totalClips = await Clip.query().count('* as total')
    const jobsToday = await Job.query().where('created_at', '>=', startOfDay.toSQL()).count('* as total')
    const activeUsersToday = await Job.query()
      .where('created_at', '>=', startOfDay.toSQL())
      .countDistinct('user_id as total')

    const platformConnections = await SocialAccount.query().select('platform').count('* as total').groupBy('platform')
    const platformMap = Object.fromEntries(PLATFORMS.map((p) => [p, 0]))
    for (const row of platformConnections) {
      platformMap[row.platform] = Number((row as any).$extras.total ?? 0)
    }

    const storageUsed = await estimateStorageUsedBytes()

    return response.json({
      total_users: Number((totalUsers[0] as any).$extras.total ?? 0),
      total_jobs: Number((totalJobs[0] as any).$extras.total ?? 0),
      total_clips: Number((totalClips[0] as any).$extras.total ?? 0),
      jobs_today: Number((jobsToday[0] as any).$extras.total ?? 0),
      active_users_today: Number((activeUsersToday[0] as any).$extras.total ?? 0),
      storage_used: storageUsed,
      platform_connections: platformMap,
    })
  }

  async users({ request, response }: HttpContext) {
    const page = Math.max(1, Number(request.input('page', 1)))
    const limit = Math.min(100, Math.max(1, Number(request.input('limit', 20))))
    const users = await User.query().orderBy('created_at', 'desc').paginate(page, limit)

    const mapped = await Promise.all(
      users.all().map(async (u) => {
        const jobCount = await Job.query().where('user_id', u.id).count('* as total')
        const lastJob = await Job.query().where('user_id', u.id).orderBy('created_at', 'desc').first()
        return {
          id: u.id,
          name: u.fullName,
          email: u.email,
          role: (u as any).role ?? 'user',
          created_at: u.createdAt?.toISO(),
          job_count: Number((jobCount[0] as any).$extras.total ?? 0),
          last_active: lastJob?.createdAt?.toISO() ?? null,
        }
      })
    )

    return response.json({
      meta: users.getMeta(),
      data: mapped,
    })
  }

  async updateRole({ params, request, response, auth }: HttpContext) {
    const user = await User.find(params.id)
    if (!user) return response.status(404).json({ error: 'User not found' })
    const role = request.input('role')
    if (!['admin', 'user'].includes(role)) return response.status(400).json({ error: 'Invalid role' })
    const me = auth.getUserOrFail()
    if (me.id === user.id && role !== 'admin') {
      return response.status(400).json({ error: 'Cannot demote yourself' })
    }
    ;(user as any).role = role
    await user.save()
    return response.json({ success: true })
  }

  async deleteUser({ params, response, auth }: HttpContext) {
    const me = auth.getUserOrFail()
    const user = await User.find(params.id)
    if (!user) return response.status(404).json({ error: 'User not found' })
    if (me.id === user.id) return response.status(400).json({ error: 'Cannot delete yourself' })
    await User.query().where('id', user.id).delete()
    return response.json({ success: true })
  }

  async getSocialCredentials({ response }: HttpContext) {
    const configured = await getConfiguredPlatforms()
    return response.json({
      platforms: PLATFORMS.map((platform) => ({ platform, configured: !!configured[platform] })),
    })
  }

  async saveSocialCredentials({ request, response }: HttpContext) {
    const platform = String(request.input('platform', '')).toLowerCase()
    const clientId = String(request.input('client_id', '')).trim()
    const clientSecret = String(request.input('client_secret', '')).trim()
    const extraConfig = request.input('extra_config') ?? null
    if (!PLATFORMS.includes(platform as any)) {
      return response.status(400).json({ error: 'Invalid platform' })
    }
    if (!clientId || !clientSecret) {
      return response.status(400).json({ error: 'client_id and client_secret are required' })
    }
    await PlatformCredential.updateOrCreate(
      { platform },
      { platform, clientId, clientSecret, extraConfig }
    )
    return response.json({ success: true })
  }

  async deleteSocialCredentials({ params, response }: HttpContext) {
    const platform = String(params.platform ?? '').toLowerCase()
    if (!PLATFORMS.includes(platform as any)) {
      return response.status(400).json({ error: 'Invalid platform' })
    }
    await PlatformCredential.query().where('platform', platform).delete()
    return response.json({ success: true })
  }

  async jobs({ request, response }: HttpContext) {
    const page = Math.max(1, Number(request.input('page', 1)))
    const limit = Math.min(100, Math.max(1, Number(request.input('limit', 20))))
    const status = request.input('status')

    const query = Job.query().preload('clips').orderBy('created_at', 'desc')
    if (status && status !== 'all') query.where('status', status)
    const jobs = await query.paginate(page, limit)

    const users = await User.query().whereIn('id', jobs.all().map((j) => j.userId).filter(Boolean) as number[])
    const userMap = new Map(users.map((u) => [u.id, u]))

    return response.json({
      meta: jobs.getMeta(),
      data: jobs.all().map((j) => ({
        id: j.id,
        user_id: j.userId,
        user_email: j.userId ? userMap.get(j.userId)?.email ?? null : null,
        video_url: j.videoUrl,
        status: j.status,
        clip_count: j.clips?.length ?? 0,
        created_at: j.createdAt?.toISO(),
      })),
    })
  }

  async jobDetail({ params, response }: HttpContext) {
    const job = await Job.query().where('id', params.id).preload('clips').first()
    if (!job) return response.status(404).json({ error: 'Job not found' })
    const user = job.userId ? await User.find(job.userId) : null
    return response.json({
      id: job.id,
      status: job.status,
      video_url: job.videoUrl,
      error: job.error,
      created_at: job.createdAt?.toISO(),
      updated_at: job.updatedAt?.toISO(),
      user: user
        ? { id: user.id, email: user.email, name: user.fullName, role: (user as any).role ?? 'user' }
        : null,
      clips: job.clips.map((c) => ({
        id: c.id,
        url: c.url,
        score: c.score,
        start_time: c.startTime,
        end_time: c.endTime,
      })),
    })
  }

  async revenue({ response }: HttpContext) {
    const totalPosts = await SocialPost.query().count('* as total')
    return response.json({
      monthly_revenue: 0,
      annual_revenue: 0,
      mrr: 0,
      subscribers: 0,
      total_posts: Number((totalPosts[0] as any).$extras.total ?? 0),
    })
  }
}

