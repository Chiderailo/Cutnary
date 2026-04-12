/*
|--------------------------------------------------------------------------
| Token Refresh Service
|--------------------------------------------------------------------------
| Refresh OAuth tokens before they expire.
*/

import { DateTime } from 'luxon'
import SocialAccount from '#models/social_account'
import { getCredentials } from '#services/credentials_service'
import type { Platform } from '#services/credentials_service'

const BUFFER_MINUTES = 5

/**
 * Check if token needs refresh (expires within BUFFER_MINUTES).
 */
export function needsRefresh(account: SocialAccount): boolean {
  if (!account.expiresAt) return false
  const bufferMs = BUFFER_MINUTES * 60 * 1000
  const exp =
    typeof account.expiresAt === 'object' && 'toMillis' in account.expiresAt
      ? (account.expiresAt as { toMillis(): number }).toMillis()
      : new Date(account.expiresAt as any).getTime()
  return exp < Date.now() + bufferMs
}

/**
 * Refresh YouTube access token.
 */
export async function refreshYouTubeToken(userId: number, accountId: number): Promise<boolean> {
  const account = await SocialAccount.query()
    .where('id', accountId)
    .where('user_id', userId)
    .where('platform', 'youtube')
    .first()
  if (!account?.refreshToken) return false

  const creds = await getCredentials('youtube')
  if (!creds) return false

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: account.refreshToken,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  const data = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) return false

  account.accessToken = data.access_token
  account.expiresAt = data.expires_in
    ? DateTime.fromMillis(Date.now() + data.expires_in * 1000)
    : account.expiresAt
  await account.save()
  return true
}

/**
 * Refresh TikTok access token.
 */
export async function refreshTikTokToken(userId: number, accountId: number): Promise<boolean> {
  const account = await SocialAccount.query()
    .where('id', accountId)
    .where('user_id', userId)
    .where('platform', 'tiktok')
    .first()
  if (!account?.refreshToken) return false

  const creds = await getCredentials('tiktok')
  if (!creds) return false

  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: account.refreshToken,
    }),
  })
  const json = (await res.json()) as { data?: { access_token?: string; expires_in?: number } }
  const tokenData = json.data
  if (!tokenData?.access_token) return false

  account.accessToken = tokenData.access_token
  account.expiresAt = tokenData.expires_in
    ? DateTime.fromMillis(Date.now() + tokenData.expires_in * 1000)
    : account.expiresAt
  await account.save()
  return true
}

/**
 * Refresh token for an account if needed.
 */
export async function ensureValidToken(account: SocialAccount): Promise<string> {
  if (!account.userId) throw new Error('Account has no user')
  const platform = account.platform as Platform

  if (platform === 'youtube' || platform === 'tiktok') {
    if (needsRefresh(account)) {
      const ok =
        platform === 'youtube'
          ? await refreshYouTubeToken(account.userId, account.id)
          : await refreshTikTokToken(account.userId, account.id)
      if (!ok) throw new Error(`Failed to refresh ${platform} token`)
      await account.refresh()
    }
  }
  return account.accessToken
}
