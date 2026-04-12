import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'social_accounts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('platform', 32).notNullable()
      table.text('access_token').notNullable()
      table.text('refresh_token').nullable()
      table.string('account_id', 128).nullable()
      table.string('account_name', 256).nullable()
      table.string('profile_picture_url', 512).nullable()
      table.integer('follower_count').nullable()
      table.timestamp('expires_at').nullable()

      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
