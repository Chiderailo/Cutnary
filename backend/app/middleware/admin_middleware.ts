import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import User from '#models/user'

export default class AdminMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    const authUser = auth.getUserOrFail()
    const freshUser = await User.find(authUser.id)
    const role = freshUser?.role ?? authUser.role
    if (role !== 'admin') {
      return response.status(403).json({ error: 'Admin access required' })
    }
    await next()
  }
}

