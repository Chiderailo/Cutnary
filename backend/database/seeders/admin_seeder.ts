import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    const user = await User.findBy('email', 'chiderailo@gmail.com')
    if (!user) {
      console.log('Admin seed skipped: user not found')
      return
    }
    ;(user as any).role = 'admin'
    await user.save()
    console.log(`Admin role set for: ${user.email}`)
  }
}

