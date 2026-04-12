import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class SocialPost extends BaseModel {
  static table = 'social_posts'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number | null

  @column()
  declare clipUrl: string

  @column()
  declare thumbnailUrl: string | null

  @column()
  declare caption: string | null

  @column({
    prepare: (v: unknown) => (v ? JSON.stringify(v) : null),
    consume: (v: string | null) => (v ? JSON.parse(v) : null),
  })
  declare hashtags: string[] | null

  @column()
  declare platform: string

  @column()
  declare externalId: string | null

  @column()
  declare externalUrl: string | null

  @column()
  declare status: string

  @column()
  declare error: string | null

  @column()
  declare views: number | null

  @column()
  declare likes: number | null

  @column()
  declare comments: number | null

  @column.dateTime()
  declare scheduledAt: DateTime | null

  @column.dateTime()
  declare postedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime | null

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
