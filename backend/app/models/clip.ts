import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Job from './job.js'

export default class Clip extends BaseModel {
  static table = 'clips'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare jobId: string

  @column()
  declare url: string

  @column()
  declare score: number | null

  @column()
  declare description: string | null

  @column()
  declare duration: number | null

  @column()
  declare startTime: number | null

  @column()
  declare endTime: number | null

  @column()
  declare viralDescription: string | null

  @column({
    prepare: (value: unknown) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? JSON.parse(value) : null),
  })
  declare words: Array<{ word: string; start: number; end: number }> | null

  @column.dateTime()
  declare createdAt: DateTime | null

  @column.dateTime()
  declare updatedAt: DateTime | null

  @belongsTo(() => Job, { foreignKey: 'jobId' })
  declare job: BelongsTo<typeof Job>
}
