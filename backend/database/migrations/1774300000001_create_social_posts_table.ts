import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'social_posts'

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
      table.string('clip_url', 512).notNullable()
      table.string('platform', 32).notNullable()
      table.string('external_id', 128).nullable()
      table.string('external_url', 512).nullable()
      table.string('status', 32).notNullable().defaultTo('pending')
      table.text('error').nullable()
      table.integer('views').nullable()
      table.integer('likes').nullable()
      table.integer('comments').nullable()
      table.timestamp('scheduled_at').nullable()
      table.timestamp('posted_at').nullable()

      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
