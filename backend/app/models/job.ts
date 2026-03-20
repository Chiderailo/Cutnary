import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Clip from './clip.js'

export type JobStatus =
  | 'queued'
  | 'downloading'
  | 'transcribing'
  | 'detecting_clips'
  | 'generating_clips'
  | 'adding_subtitles'
  | 'completed'
  | 'failed'

export default class Job extends BaseModel {
  static table = 'jobs'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: number | null

  @column()
  declare videoUrl: string

  @column()
  declare status: JobStatus

  @column()
  declare aspectRatio: string | null

  @column()
  declare clipLength: string | null

  @column()
  declare error: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => Clip, { foreignKey: 'jobId' })
  declare clips: HasMany<typeof Clip>
}
