import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, beforeCreate, column, computed, hasMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import Log from '#models/log'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { imageTypes, nanoid } from '#config/app'
import * as model_1 from '@adonisjs/lucid/types/model'
import { LogState } from '../enum/log_enum.js'
import { HttpContext } from '@adonisjs/core/http'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare publicId: string

  @column()
  declare fullName: string | null

  @column()
  declare email: string

  @column()
  declare username: string

  @column()
  declare avatar: string | null

  @computed({ serializeAs: 'avatar' })
  get avatarUrl(): object | null {
    if (!this.avatar) {
      return null
    }
    return imageTypes.reduce(
      (map, type) => {
        map[type] = `${this.avatar}?s=${type}`
        return map
      },
      {} as Record<string, string>
    )
  }

  @column()
  declare role: number

  @column()
  declare customAbilities: string[] | null

  @column({ serializeAs: null })
  declare password: string | null

  @hasMany(() => Log)
  declare logs: HasMany<typeof Log>

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  static accessTokens = DbAccessTokensProvider.forModel(User, {
    expiresIn: '30 days',
    prefix: 'oat_',
    table: 'auth_access_tokens',
    type: 'auth_token',
    tokenSecretLength: 40,
  })

  static apiTokens = DbAccessTokensProvider.forModel(User, {
    expiresIn: '365 days',
    prefix: 'uat_',
    table: 'auth_access_tokens',
    type: 'api_token',
    tokenSecretLength: 60,
  })

  @beforeCreate()
  public static ensurePublicId(model: model_1.ModelObject) {
    if (!model.publicId) {
      model.publicId = nanoid()
    }
  }

  public static async approveLog(log: Log) {
    const ctx = HttpContext.get()
    log.state = LogState.APPROVED
    log.userId = ctx?.auth?.user ? ctx.auth.user!.id : 1
    await log.save()
  }
}
