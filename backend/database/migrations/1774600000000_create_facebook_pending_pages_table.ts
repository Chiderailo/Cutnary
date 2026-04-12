import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'facebook_pending_pages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.text('user_access_token').notNullable()
      table.text('pages_json').notNullable()
      table.timestamp('created_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
