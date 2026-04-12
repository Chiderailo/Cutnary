import User from '#models/user'
import env from '#start/env'
import hash from '@adonisjs/core/services/hash'
import { randomBytes } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo'

export default class GoogleAuthController {
  /**
   * GET /api/auth/google — start OAuth (sets session state, redirects to Google).
   */
  async redirect({ request, response, session }: HttpContext) {
    const clientId = env.get('GOOGLE_CLIENT_ID')
    if (!clientId) {
      return response.status(400).json({ message: 'Google Sign-In is not configured (GOOGLE_CLIENT_ID).' })
    }

    const redirectUri =
      env.get('GOOGLE_REDIRECT_URI') ?? `${env.get('APP_URL').replace(/\/$/, '')}/api/auth/google/callback`
    const state = randomBytes(24).toString('hex')
    await session.put('google_oauth_state', state)

    const qs = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    })
    const returnTo = request.input('return_to', '') as string
    if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
      await session.put('google_oauth_return', returnTo)
    }

    return response.redirect(`${GOOGLE_AUTH}?${qs.toString()}`)
  }

  /**
   * GET /api/auth/google/callback
   */
  async callback({ request, response, session }: HttpContext) {
    const clientId = env.get('GOOGLE_CLIENT_ID')
    const clientSecret = env.get('GOOGLE_CLIENT_SECRET')
    if (!clientId || !clientSecret) {
      return response.status(400).json({ message: 'Google OAuth is not fully configured.' })
    }

    const code = request.input('code', '') as string
    const state = request.input('state', '') as string
    const err = request.input('error', '') as string
    const frontend = (env.get('FRONTEND_URL') ?? 'http://localhost:3000').replace(/\/$/, '')
    const redirectUri =
      env.get('GOOGLE_REDIRECT_URI') ?? `${env.get('APP_URL').replace(/\/$/, '')}/api/auth/google/callback`

    if (err) {
      return response.redirect(`${frontend}/auth/login?error=google_denied`)
    }

    const savedState = await session.get('google_oauth_state')
    await session.forget('google_oauth_state')
    if (!code || !state || !savedState || state !== savedState) {
      return response.redirect(`${frontend}/auth/login?error=google_state`)
    }

    const tokenRes = await fetch(GOOGLE_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokenJson = (await tokenRes.json()) as { access_token?: string }
    if (!tokenRes.ok || !tokenJson.access_token) {
      return response.redirect(`${frontend}/auth/login?error=google_token`)
    }

    const userRes = await fetch(GOOGLE_USERINFO, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    })
    const profile = (await userRes.json()) as {
      sub?: string
      email?: string
      name?: string
      picture?: string
    }
    if (!profile.sub || !profile.email) {
      return response.redirect(`${frontend}/auth/login?error=google_profile`)
    }

    let user = await User.query().where('google_sub', profile.sub).first()

    if (!user) {
      const existing = await User.query().where('email', profile.email).first()
      if (existing) {
        if (existing.googleSub && existing.googleSub !== profile.sub) {
          return response.redirect(`${frontend}/auth/login?error=google_account_mismatch`)
        }
        existing.googleSub = profile.sub
        existing.authProvider = 'google'
        existing.emailVerifiedAt = DateTime.now()
        existing.emailVerificationTokenHash = null
        if (profile.picture && !existing.profilePictureUrl) {
          existing.profilePictureUrl = profile.picture
        }
        await existing.save()
        user = existing
      }
    }

    if (!user) {
      const placeholderPassword = await hash.make(`google-oauth|${profile.sub}|${randomBytes(16).toString('hex')}`)
      user = await User.create({
        email: profile.email,
        fullName: profile.name ?? null,
        password: placeholderPassword,
        authProvider: 'google',
        googleSub: profile.sub,
        emailVerifiedAt: DateTime.now(),
        emailVerificationTokenHash: null,
        profilePictureUrl: profile.picture ?? null,
        role: 'user',
      })
    }

    const accessToken = await User.accessTokens.create(user)
    const token = accessToken.value!.release()
    const returnPath = (await session.get('google_oauth_return')) as string | undefined
    await session.forget('google_oauth_return')

    const safeRedirect =
      returnPath && returnPath.startsWith('/') && !returnPath.startsWith('//') ? returnPath : '/dashboard'
    return response.redirect(
      `${frontend}/auth/callback?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(safeRedirect)}`
    )
  }
}
