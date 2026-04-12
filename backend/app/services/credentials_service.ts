/*
|--------------------------------------------------------------------------
| Social Credentials Service
|--------------------------------------------------------------------------
| Fetch and manage app-wide OAuth credentials. Falls back to env vars.
*/

import PlatformCredential from '#models/platform_credential'
import SocialCredential from '#models/social_credential'
import env from '#start/env'

export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'facebook'

export interface PlatformCredentials {
  clientId: string
  clientSecret: string
}

async function getLegacyCredentials(platform: Platform): Promise<PlatformCredentials | null> {
  const platformKeys =
    platform === 'instagram' || platform === 'facebook' ? [platform, 'meta'] : [platform]
  const legacy = await SocialCredential.query().whereIn('platform', platformKeys).orderBy('id', 'desc').first()
  if (!legacy) return null
  return { clientId: legacy.clientId, clientSecret: legacy.clientSecret }
}

export async function getCredentials(platform: Platform): Promise<PlatformCredentials | null> {
  const cred = await PlatformCredential.query().where('platform', platform).first()
  if (cred) {
    return { clientId: cred.clientId, clientSecret: cred.clientSecret }
  }
  const legacy = await getLegacyCredentials(platform)
  if (legacy) return legacy
  return getEnvCredentials(platform)
}

function getEnvCredentials(platform: Platform): PlatformCredentials | null {
  switch (platform) {
    case 'youtube': {
      const id = env.get('YOUTUBE_CLIENT_ID')
      const secret = env.get('YOUTUBE_CLIENT_SECRET')
      return id && secret ? { clientId: id, clientSecret: secret } : null
    }
    case 'tiktok': {
      const key = env.get('TIKTOK_CLIENT_KEY')
      const secret = env.get('TIKTOK_CLIENT_SECRET')
      return key && secret ? { clientId: key, clientSecret: secret } : null
    }
    case 'instagram':
    case 'facebook': {
      const id = env.get('FACEBOOK_APP_ID')
      const secret = env.get('FACEBOOK_APP_SECRET')
      return id && secret ? { clientId: id, clientSecret: secret } : null
    }
    default:
      return null
  }
}

export async function hasCredentials(platform: Platform): Promise<boolean> {
  const cred = await PlatformCredential.query().where('platform', platform).first()
  if (cred) return true
  const legacy = await getLegacyCredentials(platform)
  if (legacy) return true
  return getEnvCredentials(platform) !== null
}

export async function getConfiguredPlatforms(): Promise<Record<string, boolean>> {
  return {
    youtube: await hasCredentials('youtube'),
    tiktok: await hasCredentials('tiktok'),
    instagram: await hasCredentials('instagram'),
    facebook: await hasCredentials('facebook'),
  }
}
