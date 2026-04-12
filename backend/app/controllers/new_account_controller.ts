import User from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import { DateTime } from 'luxon'
import {
  generateVerificationToken,
  mustVerifyEmailForNewAccounts,
  sendVerificationEmail,
} from '#services/email_verification_service'

export default class NewAccountController {
  async store({ request, response, serialize }: HttpContext) {
    const { name, fullName, email, password } = await request.validateUsing(signupValidator)

    const displayName = fullName ?? name ?? null
    const verify = mustVerifyEmailForNewAccounts()

    if (verify) {
      const { token, hash } = generateVerificationToken()
      const user = await User.create({
        fullName: displayName,
        email,
        password,
        authProvider: 'credentials',
        role: 'user',
        emailVerificationTokenHash: hash,
        emailVerifiedAt: null,
      })
      try {
        await sendVerificationEmail(user, token)
      } catch (e) {
        console.error('[auth] Failed to send verification email:', e)
        return response.status(503).json({
          message:
            'Account was created but we could not send a verification email. Check SMTP settings or try again later.',
        })
      }
      return response.status(201).json({
        needsEmailVerification: true,
        message: 'Check your email to verify your account before signing in.',
        email: user.email,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          name: user.fullName,
          role: user.role,
          emailVerified: false,
          authProvider: user.authProvider,
        },
      })
    }

    const user = await User.create({
      fullName: displayName,
      email,
      password,
      authProvider: 'credentials',
      role: 'user',
      emailVerifiedAt: DateTime.now(),
      emailVerificationTokenHash: null,
    })

    const accessToken = await User.accessTokens.create(user)
    return serialize({
      user: UserTransformer.transform(user),
      token: accessToken.value!.release(),
    })
  }
}
