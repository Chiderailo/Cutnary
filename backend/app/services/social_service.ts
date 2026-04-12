/*
|--------------------------------------------------------------------------
| Social Service
|--------------------------------------------------------------------------
| OAuth flows, token storage, posting to platforms.
*/

import { DateTime } from 'luxon'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import SocialAccount from '#models/social_account'
import SocialPost from '#models/social_post'
import FacebookPendingPage from '#models/facebook_pending_page'
import env from '#start/env'
import { getCredentials } from '#services/credentials_service'

const APP_URL = (env.get('APP_URL') ?? 'http://localhost:3333').replace(/\/$/, '')

async function fetchFacebookPagePictureUrl(
  pageId: string,
  pageAccessToken: string
): Promise<string | null> {
  const res = await fetch(
    `https://graph.facebook.com/v25.0/${pageId}/picture?redirect=0&type=large&access_token=${pageAccessToken}`
  )
  if (!res.ok) return null
  const data = (await res.json()) as { data?: { url?: string } }
  return data.data?.url ?? null
}

export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'facebook'

export type ExchangeResult =
  | { account: SocialAccount }
  | { facebookSelectPage: { pendingId: number } }

async function getYoutubeDbCredentials(): Promise<{ clientId: string; clientSecret: string } | null> {
  const creds = await getCredentials('youtube')
  if (!creds) return null
  return creds
}

export async function getOAuthUrl(platform: Platform, userId: number): Promise<string> {
  const creds = await getCredentials(platform)
  if (!creds) throw new Error('platform_not_configured')
  const state = Buffer.from(JSON.stringify({ userId, platform, ts: Date.now() })).toString('base64')
  switch (platform) {
    case 'youtube': {
      const youtubeCreds = await getYoutubeDbCredentials()
      if (!youtubeCreds) {
        throw new Error('platform_not_configured')
      }
      const clientId = youtubeCreds.clientId
      const scopes = encodeURIComponent(
        'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly'
      )
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        `${APP_URL}/api/social/oauth/youtube/callback`
      )}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent&state=${state}`
    }
    case 'tiktok': {
      const clientKey = creds.clientId
      const scopes = encodeURIComponent('user.info.basic,video.upload,video.publish')
      return `https://www.tiktok.com/auth/authorize/?client_key=${clientKey}&scope=${scopes}&response_type=code&redirect_uri=${encodeURIComponent(
        `${APP_URL}/api/social/oauth/tiktok/callback`
      )}&state=${state}`
    }
    case 'instagram': {
      const appId = creds.clientId
      const instagramAuthUrl =
        `https://www.instagram.com/oauth/authorize?` +
        `enable_fb_login=0&` +
        `force_authentication=1&` +
        `client_id=${appId}&` +
        `redirect_uri=${encodeURIComponent(`${APP_URL}/api/social/oauth/instagram/callback`)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('instagram_business_basic,instagram_business_content_publish')}&` +
        `state=${state}`
      return instagramAuthUrl
    }
    case 'facebook': {
      const appId = creds.clientId
      const scope = [
        'pages_show_list',
        'pages_manage_posts',
        'pages_read_engagement',
        'public_profile',
      ].join(',')
      const redirectUri = `${APP_URL}/api/social/oauth/facebook/callback`
      return (
        `https://www.facebook.com/v25.0/dialog/oauth?` +
        `client_id=${appId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `state=${encodeURIComponent(state)}`
      )
    }
    default:
      throw new Error(`Unknown platform: ${platform}`)
  }
}

export async function exchangeCodeForTokens(
  platform: Platform,
  code: string,
  userId: number
): Promise<ExchangeResult> {
  const creds = await getCredentials(platform)
  if (!creds) throw new Error(`${platform} OAuth not configured`)
  const redirectUri = `${APP_URL}/api/social/oauth/${platform}/callback`
  let accessToken = ''
  let refreshToken: string | null = null
  let accountId: string | null = null
  let accountName: string | null = null
  let profilePictureUrl: string | null = null
  let followerCount: number | null = null
  let expiresAt: DateTime | null = null

  switch (platform) {
    case 'youtube': {
      const youtubeCreds = await getYoutubeDbCredentials()
      if (!youtubeCreds) throw new Error('platform_not_configured')
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          client_id: youtubeCreds.clientId,
          client_secret: youtubeCreds.clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })
      const data = (await res.json()) as {
        access_token?: string
        refresh_token?: string
        expires_in?: number
        error?: string
        error_description?: string
      }
      console.log('[YouTube OAuth] Token response:', JSON.stringify(data))
      if (data.error) {
        console.error('[YouTube OAuth] Token error:', data.error, data.error_description ?? '')
        throw new Error(data.error)
      }
      if (!data.access_token) throw new Error('youtube_token_exchange_failed')
      accessToken = data.access_token
      refreshToken = data.refresh_token ?? null
      expiresAt = data.expires_in
        ? DateTime.fromMillis(Date.now() + data.expires_in * 1000)
        : null

      const channelRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )
      const channelData = (await channelRes.json()) as {
        items?: Array<{
          id: string
          snippet?: { title?: string; thumbnails?: { default?: { url?: string } } }
          statistics?: { subscriberCount?: string }
        }>
      }
      console.log('[YouTube OAuth] Channel data:', JSON.stringify(channelData))
      const channel = channelData.items?.[0]
      if (!channel) throw new Error('no_channel')

      accountId = channel.id ?? null
      accountName = channel.snippet?.title ?? null
      profilePictureUrl = channel.snippet?.thumbnails?.default?.url ?? null
      followerCount = Number.parseInt(channel.statistics?.subscriberCount ?? '0', 10) || 0

      const meRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const me = (await meRes.json()) as { email?: string }
      if (!accountName && me.email) accountName = me.email
      break
    }
    case 'tiktok': {
      const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      })
      const data = (await res.json()) as { data?: { access_token?: string; open_id?: string; expires_in?: number } }
      const tokenData = data.data
      if (!tokenData?.access_token) throw new Error('TikTok token exchange failed')
      accessToken = tokenData.access_token
      accountId = tokenData.open_id ?? null
      expiresAt = tokenData.expires_in
        ? DateTime.fromMillis(Date.now() + tokenData.expires_in * 1000)
        : null
      break
    }
    case 'instagram': {
      const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code,
        }),
      })
      const tokenData = (await tokenRes.json()) as {
        access_token?: string
        user_id?: string | number
        error_type?: string
      }
      if (tokenData.error_type || !tokenData.access_token) {
        throw new Error('Instagram OAuth token exchange failed')
      }

      const shortToken = tokenData.access_token
      const igUserId = tokenData.user_id ? String(tokenData.user_id) : null

      const longTokenRes = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(
          creds.clientSecret
        )}&access_token=${encodeURIComponent(shortToken)}`
      )
      const longTokenData = (await longTokenRes.json()) as {
        access_token?: string
        expires_in?: number
      }

      accessToken = longTokenData.access_token ?? shortToken
      const expiresIn = longTokenData.expires_in ?? 5184000
      expiresAt = DateTime.fromMillis(Date.now() + expiresIn * 1000)

      const userRes = await fetch(
        `https://graph.instagram.com/v21.0/me?fields=id,name,username,profile_picture_url,followers_count&access_token=${encodeURIComponent(
          accessToken
        )}`
      )
      const userData = (await userRes.json()) as {
        id?: string
        name?: string
        username?: string
        profile_picture_url?: string
        followers_count?: number | string
      }

      accountId = igUserId ?? userData.id ?? null
      accountName = userData.username || userData.name || 'Instagram User'
      profilePictureUrl = userData.profile_picture_url ?? null
      followerCount = Number.parseInt(String(userData.followers_count ?? '0'), 10) || 0

      if (!accountId) {
        throw new Error('Instagram account id missing')
      }
      break
    }
    case 'facebook': {
      const tokenRes = await fetch('https://graph.facebook.com/v25.0/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          redirect_uri: redirectUri,
          code,
        }),
      })
      const shortData = (await tokenRes.json()) as {
        access_token?: string
        error?: { message?: string }
      }
      if (!shortData.access_token) {
        throw new Error(shortData.error?.message ?? 'Facebook OAuth token exchange failed')
      }
      const shortUserToken = shortData.access_token

      const longUrl = new URL('https://graph.facebook.com/v25.0/oauth/access_token')
      longUrl.searchParams.set('grant_type', 'fb_exchange_token')
      longUrl.searchParams.set('client_id', creds.clientId)
      longUrl.searchParams.set('client_secret', creds.clientSecret)
      longUrl.searchParams.set('fb_exchange_token', shortUserToken)
      const longRes = await fetch(longUrl.toString())
      const longData = (await longRes.json()) as {
        access_token?: string
        error?: { message?: string }
      }
      if (!longData.access_token) {
        throw new Error(longData.error?.message ?? 'Facebook long-lived token exchange failed')
      }
      const userLongLivedToken = longData.access_token

      const meRes = await fetch(
        `https://graph.facebook.com/v25.0/me?fields=id,name,picture&access_token=${userLongLivedToken}`
      )
      const meData = (await meRes.json()) as {
        id?: string
        name?: string
        picture?: { data?: { url?: string } }
      }
      const pagesRes = await fetch(
        `https://graph.facebook.com/v25.0/me/accounts?fields=id,name,access_token&access_token=${userLongLivedToken}`
      )
      const pagesData = (await pagesRes.json()) as {
        data?: Array<{
          id: string
          name: string
          access_token: string
        }>
        error?: { message?: string }
      }
      if (pagesData.error?.message) {
        throw new Error(pagesData.error.message)
      }
      const pages = pagesData.data ?? []
      if (pages.length === 0) {
        throw new Error('No Facebook Pages found. Create a Facebook Page first.')
      }

      const pagesWithPictures = await Promise.all(
        pages.map(async (p) => {
          const url = await fetchFacebookPagePictureUrl(p.id, p.access_token)
          const picture = url ? { data: { url } } : undefined
          return { ...p, picture }
        })
      )

      if (pagesWithPictures.length > 1) {
        const pending = await FacebookPendingPage.create({
          userId,
          userAccessToken: userLongLivedToken,
          pagesJson: pagesWithPictures.map((p) => ({
            id: p.id,
            name: p.name,
            access_token: p.access_token,
            picture: p.picture,
          })),
        })
        return { facebookSelectPage: { pendingId: pending.id } }
      }
      const page = pagesWithPictures[0]
      accountId = page.id
      accountName = page.name || meData.name || null
      accessToken = page.access_token
      profilePictureUrl = page.picture?.data?.url ?? meData.picture?.data?.url ?? null
      break
    }
    default:
      throw new Error(`Unknown platform: ${platform}`)
  }

  const existing = await SocialAccount.query()
    .where('user_id', userId)
    .where('platform', platform)
    .first()

  if (existing) {
    existing.accessToken = accessToken
    existing.refreshToken = refreshToken
    existing.accountId = accountId
    existing.accountName = accountName
    existing.profilePictureUrl = profilePictureUrl
    existing.followerCount = followerCount
    existing.expiresAt = expiresAt
    await existing.save()
    return { account: existing }
  }

  const account = await SocialAccount.create({
    userId,
    platform,
    accessToken,
    refreshToken,
    accountId,
    accountName,
    profilePictureUrl,
    followerCount,
    expiresAt,
  })
  return { account }
}

export async function getAccountsForUser(userId: number) {
  return SocialAccount.query().where('user_id', userId)
}

export type PendingPage = { id: string; name: string; access_token: string; picture?: { data?: { url?: string } } }

export async function getPendingPages(userId: number, pendingId: number): Promise<PendingPage[] | null> {
  const pending = await FacebookPendingPage.query()
    .where('id', pendingId)
    .where('user_id', userId)
    .first()
  if (!pending) return null
  return pending.pagesJson
}

export async function selectPageFromPending(
  userId: number,
  pendingId: number,
  pageId: string
): Promise<SocialAccount> {
  const pending = await FacebookPendingPage.query()
    .where('id', pendingId)
    .where('user_id', userId)
    .first()
  if (!pending) throw new Error('Invalid or expired page selection')
  const page = pending.pagesJson.find((p) => p.id === pageId)
  if (!page) throw new Error('Page not found')
  const existing = await SocialAccount.query()
    .where('user_id', userId)
    .where('platform', 'facebook')
    .first()
  if (existing) {
    existing.accessToken = page.access_token
    existing.accountId = page.id
    existing.accountName = page.name
    existing.profilePictureUrl = page.picture?.data?.url ?? null
    await existing.save()
    await pending.delete()
    return existing
  }
  const account = await SocialAccount.create({
    userId,
    platform: 'facebook',
    accessToken: page.access_token,
    refreshToken: null,
    accountId: page.id,
    accountName: page.name,
    profilePictureUrl: page.picture?.data?.url ?? null,
    followerCount: null,
    expiresAt: null,
  })
  await pending.delete()
  return account
}

export async function disconnectAccount(userId: number, accountId: number) {
  const account = await SocialAccount.query()
    .where('id', accountId)
    .where('user_id', userId)
    .first()
  if (account) await account.delete()
}

export async function getPostStatus(postId: number, userId: number) {
  return SocialPost.query().where('id', postId).where('user_id', userId).first()
}

export async function getPostsForUser(userId: number, limit = 50) {
  return SocialPost.query().where('user_id', userId).orderBy('created_at', 'desc').limit(limit)
}

async function fetchVideoBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch video: ${res.status}`)
  return res.arrayBuffer()
}

async function getVideoBufferFromClipUrl(clipUrl: string): Promise<Buffer> {
  if (clipUrl.startsWith('http://') || clipUrl.startsWith('https://')) {
    console.log('[YOUTUBE] Downloading clip from URL:', clipUrl)
    const dlRes = await fetch(clipUrl)
    const dlText = dlRes.ok ? '' : await dlRes.text()
    if (!dlRes.ok) {
      throw new Error(`Failed to download clip URL (${dlRes.status}): ${dlText}`)
    }
    return Buffer.from(await dlRes.arrayBuffer())
  }

  let localPath = clipUrl
  if (!isAbsolute(localPath)) {
    localPath = resolve(process.cwd(), localPath)
  }

  // Some payloads can arrive as /storage/clips/file.mp4; map to project storage.
  if (clipUrl.startsWith('/storage/')) {
    localPath = join(process.cwd(), '..', clipUrl)
  }

  console.log('[YOUTUBE] Reading local clip:', localPath)
  return readFile(localPath)
}

async function refreshYouTubeToken(account: SocialAccount): Promise<void> {
  if (!account.refreshToken) {
    throw new Error('No refresh token available')
  }

  const creds = await getCredentials('youtube')
  if (!creds) throw new Error('YouTube credentials not found')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refresh_token: account.refreshToken,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  const data = (await res.json()) as {
    access_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }

  if (!res.ok || data.error || !data.access_token) {
    throw new Error(`Token refresh failed: ${data.error ?? data.error_description ?? 'unknown_error'}`)
  }

  await account
    .merge({
      accessToken: data.access_token,
      expiresAt: data.expires_in ? DateTime.fromMillis(Date.now() + data.expires_in * 1000) : null,
    })
    .save()

  console.log('[YOUTUBE] Token refreshed successfully')
}

async function postToYouTube(post: SocialPost, account: SocialAccount): Promise<{ externalId?: string; externalUrl?: string }> {
  // Refresh proactively before YouTube API calls.
  await refreshYouTubeToken(account)

  const videoBuffer = await getVideoBufferFromClipUrl(post.clipUrl)
  const videoSize = videoBuffer.length
  const title = (post.caption ?? 'New Clip').slice(0, 100)
  const description = [post.caption ?? '', ...(post.hashtags ?? []).map((h) => `#${h}`)]
    .filter(Boolean)
    .join('\n')
    .slice(0, 5000)
  const tags = (post.hashtags ?? []).slice(0, 10)

  const metadata = {
    snippet: {
      title,
      description,
      tags,
      categoryId: '22',
    },
    status: {
      privacyStatus: 'public',
      selfDeclaredMadeForKids: false,
    },
  }

  console.log('[YOUTUBE] Posting clip:', post.clipUrl)
  console.log('[YOUTUBE] Title:', title)
  console.log('[YOUTUBE] Access token (first 10):', account.accessToken?.substring(0, 10))
  console.log('[YOUTUBE] Video size:', videoSize, 'bytes')

  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(videoSize),
      },
      body: JSON.stringify(metadata),
    }
  )
  const initText = await initRes.text()
  console.log('[YOUTUBE] Init response status:', initRes.status)
  console.log('[YOUTUBE] Init response body:', initText)

  if (!initRes.ok) {
    throw new Error(`YouTube init failed: ${initText}`)
  }

  const uploadUrl = initRes.headers.get('location')
  if (!uploadUrl) {
    throw new Error('YouTube did not return upload URL')
  }

  console.log('[YOUTUBE] Upload URL received, uploading video...')
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(videoSize),
    },
    body: videoBuffer,
  })

  const uploadText = await uploadRes.text()
  console.log('[YOUTUBE] Upload status:', uploadRes.status)
  if (!uploadRes.ok && uploadRes.status !== 200 && uploadRes.status !== 201) {
    console.error('[YOUTUBE] Upload error:', uploadText)
    throw new Error(`YouTube upload failed: ${uploadText}`)
  }

  const result = uploadText ? (JSON.parse(uploadText) as { id?: string }) : {}
  console.log('[YOUTUBE] Upload complete, video ID:', result.id)
  return {
    externalId: result.id,
    externalUrl: result.id ? `https://www.youtube.com/shorts/${result.id}` : undefined,
  }
}

export async function postToPlatform(
  platform: Platform,
  clipUrl: string,
  title: string,
  description: string,
  tags: string[],
  accessToken: string,
  extra?: { instagramAccountId?: string; pageId?: string }
): Promise<{ externalId?: string; externalUrl?: string }> {
  switch (platform) {
    case 'youtube': {
      console.log('[YOUTUBE] Posting clip:', clipUrl)
      console.log('[YOUTUBE] Title:', title)
      console.log('[YOUTUBE] Access token (first 10):', accessToken?.substring(0, 10))
      const buffer = await fetchVideoBuffer(clipUrl)
      const metadata = {
        snippet: {
          title: title.slice(0, 100),
          description: description.slice(0, 5000),
          tags: tags.slice(0, 10),
          categoryId: '22',
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      }
      const initRes = await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': 'video/mp4',
            'X-Upload-Content-Length': String(buffer.byteLength),
          },
          body: JSON.stringify(metadata),
        }
      )
      const initText = await initRes.text()
      console.log('[YOUTUBE] Init response status:', initRes.status)
      console.log('[YOUTUBE] Init response body:', initText)
      if (!initRes.ok) throw new Error(`YouTube init failed: ${initText}`)
      const uploadUrl = initRes.headers.get('Location')
      if (!uploadUrl) throw new Error('No upload URL')
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'video/mp4' },
        body: buffer,
      })
      const uploadText = await uploadRes.text()
      if (!uploadRes.ok) throw new Error(`YouTube upload failed: ${uploadText}`)
      const result = (uploadText ? JSON.parse(uploadText) : {}) as { id?: string }
      return { externalId: result.id, externalUrl: result.id ? `https://www.youtube.com/shorts/${result.id}` : undefined }
    }
    case 'tiktok': {
      const buffer = await fetchVideoBuffer(clipUrl)
      const fileSize = buffer.byteLength
      const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: {
            title: title.slice(0, 150),
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: fileSize,
            chunk_size: fileSize,
            total_chunk_count: 1,
          },
        }),
      })
      if (!initRes.ok) throw new Error(`TikTok init failed: ${await initRes.text()}`)
      const initData = (await initRes.json()) as { data?: { upload_url?: string; publish_id?: string } }
      const uploadUrl = initData.data?.upload_url
      if (!uploadUrl) throw new Error('No TikTok upload URL')
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
        },
        body: buffer,
      })
      if (!uploadRes.ok) throw new Error(`TikTok upload failed: ${await uploadRes.text()}`)
      return { externalId: initData.data?.publish_id }
    }
    case 'instagram': {
      if (!extra?.instagramAccountId) throw new Error('Instagram account ID required')
      if (!clipUrl.startsWith('http://') && !clipUrl.startsWith('https://')) {
        throw new Error('Instagram requires a publicly accessible video_url')
      }
      const caption = `${description}\n\n${tags.map((t) => `#${t}`).join(' ')}`.slice(0, 2200)
      const containerRes = await fetch(
        `https://graph.instagram.com/v21.0/${extra.instagramAccountId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            media_type: 'REELS',
            video_url: clipUrl,
            caption,
            access_token: accessToken,
          }),
        }
      )
      if (!containerRes.ok) throw new Error(`Instagram container failed: ${await containerRes.text()}`)
      const containerData = (await containerRes.json()) as { id?: string }
      const containerId = containerData.id
      if (!containerId) throw new Error('No container ID')
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000))
        const statusRes = await fetch(
          `https://graph.instagram.com/v21.0/${containerId}?fields=status_code,status&access_token=${accessToken}`
        )
        const statusData = (await statusRes.json()) as { status_code?: string; status?: string }
        if (statusData.status_code === 'FINISHED') break
      }
      const publishRes = await fetch(
        `https://graph.instagram.com/v21.0/${extra.instagramAccountId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ creation_id: containerId, access_token: accessToken }),
        }
      )
      if (!publishRes.ok) throw new Error(`Instagram publish failed: ${await publishRes.text()}`)
      const publishData = (await publishRes.json()) as { id?: string }
      return { externalId: publishData.id }
    }
    case 'facebook': {
      if (!extra?.pageId) throw new Error('Facebook page ID required')
      const buffer = await fetchVideoBuffer(clipUrl)
      const fileSize = buffer.byteLength
      const startRes = await fetch(
        `https://graph.facebook.com/v25.0/${extra.pageId}/video_reels`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ upload_phase: 'start', access_token: accessToken }),
        }
      )
      if (!startRes.ok) throw new Error(`Facebook init failed: ${await startRes.text()}`)
      const startData = (await startRes.json()) as { upload_session_id?: string; video_id?: string }
      const sessionId = startData.upload_session_id
      const videoId = startData.video_id
      if (!sessionId || !videoId) throw new Error('No Facebook upload session')
      const uploadRes = await fetch(
        `https://rupload.facebook.com/video-upload/v25.0/${sessionId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `OAuth ${accessToken}`,
            offset: '0',
            file_size: String(fileSize),
          },
          body: buffer,
        }
      )
      if (!uploadRes.ok) throw new Error(`Facebook upload failed: ${await uploadRes.text()}`)
      await fetch(`https://graph.facebook.com/v25.0/${extra.pageId}/video_reels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          video_id: videoId,
          upload_phase: 'finish',
          video_state: 'PUBLISHED',
          description: description.slice(0, 63206),
          access_token: accessToken,
        }),
      })
      return { externalId: videoId }
    }
    default:
      throw new Error(`Unknown platform: ${platform}`)
  }
}

/**
 * Process scheduled posts that are due. Run every minute.
 */
async function processScheduledPost(post: SocialPost): Promise<void> {
  try {
    await post.merge({ status: 'posting' }).save()

    const account = await SocialAccount.query()
      .where('user_id', post.userId!)
      .where('platform', post.platform)
      .first()

    if (!account) {
      throw new Error(`No ${post.platform} account connected`)
    }

    console.log(`[SCHEDULER] Posting to ${post.platform} for user ${post.userId}`)

    let result: { externalId?: string; externalUrl?: string }
    if (post.platform === 'youtube') {
      result = await postToYouTube(post, account)
    } else {
      let accessToken = account.accessToken
      const refreshCutoff = DateTime.now().plus({ minutes: 5 })
      if (account.expiresAt && account.expiresAt <= refreshCutoff) {
        console.log('[SCHEDULER] Refreshing token...')
        const { ensureValidToken } = await import('#services/token_refresh_service')
        accessToken = await ensureValidToken(account)
      }

      const title = (post.caption ?? 'Check this out!').slice(0, 100)
      const description = post.caption ?? ''
      const tags = post.hashtags ?? ['viral', 'trending', 'fyp', 'reels', 'shorts']
      const extra: { instagramAccountId?: string; pageId?: string } = {}
      if (post.platform === 'instagram') extra.instagramAccountId = account.accountId ?? undefined
      if (post.platform === 'facebook') extra.pageId = account.accountId ?? undefined

      result = await postToPlatform(
        post.platform as Platform,
        post.clipUrl,
        title,
        description,
        tags,
        accessToken,
        extra
      )
    }

    await post
      .merge({
        status: 'published',
        postedAt: DateTime.now(),
        externalId: result.externalId ?? null,
        externalUrl: result.externalUrl ?? null,
      })
      .save()

    console.log(`[SCHEDULER] Successfully posted ${post.id} to ${post.platform}`)
    const { createNotification } = await import('#services/notification_service')
    await createNotification(post.userId!, 'post_success', { platform: post.platform })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[SCHEDULER] Failed to post ${post.id}:`, message)
    await post
      .merge({
        status: 'failed',
        error: message,
      })
      .save()
    const { createNotification } = await import('#services/notification_service')
    await createNotification(post.userId!, 'post_failed', {
      platform: post.platform,
      error: message,
    })
  }
}

export async function processScheduledPosts(): Promise<number> {
  const now = DateTime.now()
  console.log('[SCHEDULER] Running at:', now.toISO())
  const due = await SocialPost.query()
    .where('status', 'scheduled')
    .whereNotNull('scheduled_at')
    .where('scheduled_at', '<=', now.toSQL())
    .limit(10)

  console.log(`[SCHEDULER] Found ${due.length} posts to process`)

  let processed = 0
  for (const post of due) {
    console.log(`[SCHEDULER] Processing post ${post.id} for platform ${post.platform}`)
    await processScheduledPost(post)
    processed++
  }
  return processed
}
