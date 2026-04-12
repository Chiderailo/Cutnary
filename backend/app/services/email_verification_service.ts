import crypto from 'node:crypto'
import User from '#models/user'
import { DateTime } from 'luxon'
import env from '#start/env'
import { isSmtpConfigured, sendTransactionalEmail } from '#services/mail_service'

export function hashVerificationToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex')
}

export function generateVerificationToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex')
  return { token, hash: hashVerificationToken(token) }
}

/** When true, new password registrations must verify email before login (requires SMTP). */
export function mustVerifyEmailForNewAccounts(): boolean {
  if (env.get('REQUIRE_EMAIL_VERIFICATION') === false) return false
  return isSmtpConfigured()
}

export async function sendVerificationEmail(user: User, plainToken: string): Promise<void> {
  const api = env.get('APP_URL').replace(/\/$/, '')
  const verifyUrl = `${api}/api/auth/verify-email?token=${encodeURIComponent(plainToken)}`

  await sendTransactionalEmail({
    to: user.email,
    subject: 'Verify your Cutnary account',
    text: `Hi,\n\nPlease verify your email by opening this link:\n${verifyUrl}\n\n— Cutnary`,
    html: `
      <p>Hi${user.fullName ? ` ${user.fullName}` : ''},</p>
      <p>Please confirm your email address to activate your Cutnary account.</p>
      <p><a href="${verifyUrl}" style="color:#7c3aed;">Verify email address</a></p>
      <p style="color:#666;font-size:12px;">If you did not create an account, you can ignore this message.</p>
      <p>— Cutnary</p>
    `,
  })
}

export async function markEmailVerified(user: User): Promise<void> {
  user.emailVerifiedAt = DateTime.now()
  user.emailVerificationTokenHash = null
  await user.save()
}
