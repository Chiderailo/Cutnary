import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import encryption from '@adonisjs/core/services/encryption'

export default class SocialCredential extends BaseModel {
  static table = 'social_credentials'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare platform: string

  @column()
  declare clientId: string

  @column({
    serializeAs: null,
    prepare: (v: unknown) => (v ? encryption.encrypt(String(v)) : null),
    consume: (v: string | null) => {
      if (!v) return ''
      try {
        return encryption.decrypt<string>(v) ?? ''
      } catch {
        return ''
      }
    },
  })
  declare clientSecret: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
