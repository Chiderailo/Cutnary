import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class FacebookPendingPage extends BaseModel {
  static table = 'facebook_pending_pages'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column({ serializeAs: null })
  declare userAccessToken: string

  @column({
    prepare: (v: unknown) => (v ? JSON.stringify(v) : null),
    consume: (v: string | null) => (v ? JSON.parse(v) : []),
  })
  declare pagesJson: Array<{ id: string; name: string; access_token: string; picture?: { data?: { url?: string } } }>

  @column.dateTime()
  declare createdAt: DateTime | null
}
