import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    const obj = this.pick(this.resource, [
      'id',
      'fullName',
      'email',
      'emailVerifiedAt',
      'createdAt',
      'updatedAt',
      'initials',
      'profilePictureUrl',
      'authProvider',
      'subscriptionPlan',
      'role',
    ])
    return {
      ...obj,
      name: obj.fullName,
      emailVerified: obj.emailVerifiedAt != null,
    }
  }
}
