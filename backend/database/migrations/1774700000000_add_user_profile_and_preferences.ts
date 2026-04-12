import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('profile_picture_url').nullable()
      table.string('auth_provider', 32).nullable().defaultTo('credentials')
      table.string('default_aspect_ratio', 16).nullable().defaultTo('9:16')
      table.string('default_clip_length', 32).nullable().defaultTo('auto')
      table.string('default_language', 8).nullable().defaultTo('en')
      table.string('subscription_plan', 32).nullable().defaultTo('free')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('profile_picture_url')
      table.dropColumn('auth_provider')
      table.dropColumn('default_aspect_ratio')
      table.dropColumn('default_clip_length')
      table.dropColumn('default_language')
      table.dropColumn('subscription_plan')
    })
  }
}
