import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Fix jobs table: drop and recreate with UUID primary key.
 * The database may have been created with auto-increment integer id.
 * This migration ensures jobs.id is a string UUID and clips.job_id references it.
 */
export default class extends BaseSchema {
  async up() {
    // Drop clips first (has FK to jobs)
    this.schema.dropTableIfExists('clips')

    // Drop jobs
    this.schema.dropTableIfExists('jobs')

    // Recreate jobs with string UUID primary key
    this.schema.createTable('jobs', (table) => {
      table.string('id', 36).primary()
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('video_url').notNullable()
      table.string('status', 50).notNullable().defaultTo('queued')
      table.string('aspect_ratio', 20).nullable()
      table.string('clip_length', 20).nullable()
      table.text('error').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    // Recreate clips with string job_id foreign key
    this.schema.createTable('clips', (table) => {
      table.increments('id')
      table
        .string('job_id', 36)
        .notNullable()
        .references('id')
        .inTable('jobs')
        .onDelete('CASCADE')
      table.string('url').notNullable()
      table.integer('score').nullable()
      table.text('description').nullable()
      table.integer('duration').nullable()
      table.float('start_time').nullable()
      table.float('end_time').nullable()
      table.text('viral_description').nullable()
      table.json('words').nullable()

      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTableIfExists('clips')
    this.schema.dropTableIfExists('jobs')

    // Recreate original tables (re-run create_jobs_table and create_clips_table logic)
    this.schema.createTable('jobs', (table) => {
      table.string('id', 36).primary()
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('video_url').notNullable()
      table.string('status', 50).notNullable().defaultTo('queued')
      table.string('aspect_ratio', 20).nullable()
      table.string('clip_length', 20).nullable()
      table.text('error').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('clips', (table) => {
      table.increments('id')
      table
        .string('job_id', 36)
        .notNullable()
        .references('id')
        .inTable('jobs')
        .onDelete('CASCADE')
      table.string('url').notNullable()
      table.integer('score').nullable()
      table.text('description').nullable()
      table.integer('duration').nullable()
      table.float('start_time').nullable()
      table.float('end_time').nullable()
      table.text('viral_description').nullable()
      table.json('words').nullable()
      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
    })
  }
}
