import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import encryption from '@adonisjs/core/services/encryption'

export default class PlatformCredential extends BaseModel {
  static table = 'platform_credentials'

  @column({ isPrimary: true })
  declare id: number

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

  @column({
    prepare: (v: unknown) => (v ? JSON.stringify(v) : null),
    consume: (v: string | null) => (v ? JSON.parse(v) : null),
  })
  declare extraConfig: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime | null

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}

