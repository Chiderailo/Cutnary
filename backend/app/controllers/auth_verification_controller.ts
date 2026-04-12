import User from '#models/user'
import env from '#start/env'
import {
  generateVerificationToken,
  hashVerificationToken,
  markEmailVerified,
  mustVerifyEmailForNewAccounts,
  sendVerificationEmail,
} from '#services/email_verification_service'
import { isSmtpConfigured } from '#services/mail_service'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

const resendValidator = vine.compile(
  vine.object({
    email: vine.string().email().maxLength(254),
  })
)

export default class AuthVerificationController {
  /**
   * GET /api/auth/verify-email?token=
   * Confirms email and redirects to the SPA.
   */
  async verifyEmail({ request, response }: HttpContext) {
    const frontend = (env.get('FRONTEND_URL') ?? 'http://localhost:3000').replace(/\/$/, '')
    const token = request.input('token', '') as string
    if (!token) {
      return response.redirect(`${frontend}/auth/verify-email?error=missing_token`)
    }
    const hashed = hashVerificationToken(token)
    const user = await User.query().where('emailVerificationTokenHash', hashed).first()
    if (!user) {
      return response.redirect(`${frontend}/auth/verify-email?error=invalid_token`)
    }
    await markEmailVerified(user)
    return response.redirect(`${frontend}/auth/verified?email=${encodeURIComponent(user.email)}`)
  }

  /**
   * POST /api/auth/resend-verification
   * Body: { email }
   */
  async resendVerification({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(resendValidator)
    const generic = { success: true, message: 'If an account exists for that email, we sent a new link.' }

    if (!isSmtpConfigured()) {
      return response.status(200).json(generic)
    }

    const user = await User.query().where('email', email).whereNull('emailVerifiedAt').first()
    if (!user) {
      return response.status(200).json(generic)
    }

    const { token, hash } = generateVerificationToken()
    user.emailVerificationTokenHash = hash
    await user.save()
    try {
      await sendVerificationEmail(user, token)
    } catch {
      return response.status(200).json(generic)
    }
    return response.status(200).json(generic)
  }

  /**
   * GET /api/auth/verification-required
   * Returns whether SMTP + verification policy is active (for UI).
   */
  async status({ response }: HttpContext) {
    return response.status(200).json({
      smtpConfigured: isSmtpConfigured(),
      mustVerifyNewAccounts: mustVerifyEmailForNewAccounts(),
    })
  }
}
