import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'jobs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 36).primary()
      table.integer('user_id').unsigned().nullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('video_url').notNullable()
      table.string('status', 50).notNullable().defaultTo('queued')
      table.string('aspect_ratio', 20).nullable()
      table.string('clip_length', 20).nullable()
      table.text('error').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
