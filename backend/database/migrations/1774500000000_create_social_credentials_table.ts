import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'social_credentials'

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
      table.string('platform', 20).notNullable()
      table.text('client_id').notNullable()
      table.text('client_secret').notNullable()

      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()

      table.unique(['user_id', 'platform'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
