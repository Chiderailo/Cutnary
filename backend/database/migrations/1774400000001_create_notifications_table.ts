import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

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
      table.string('type', 64).notNullable()
      table.text('message').notNullable()
      table.boolean('read').notNullable().defaultTo(false)

      table.timestamp('created_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
