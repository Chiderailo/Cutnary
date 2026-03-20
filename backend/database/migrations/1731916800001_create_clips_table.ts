import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clips'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('job_id', 36).notNullable().references('id').inTable('jobs').onDelete('CASCADE')
      table.string('url').notNullable()
      table.integer('score').nullable()
      table.text('description').nullable()
      table.integer('duration').nullable()
      table.float('start_time').nullable()
      table.float('end_time').nullable()
      table.text('viral_description').nullable()

      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
