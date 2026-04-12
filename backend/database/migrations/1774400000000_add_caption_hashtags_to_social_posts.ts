import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'social_posts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('caption').nullable()
      table.json('hashtags').nullable()
      table.string('thumbnail_url', 512).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('caption')
      table.dropColumn('hashtags')
      table.dropColumn('thumbnail_url')
    })
  }
}
