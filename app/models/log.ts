import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { nanoid } from '#config/app'
import { LogAction, LogModel, LogState } from '../enum/log_enum.js'

export default class Log extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare publicId: string

  @column()
  declare action: LogAction

  @column()
  declare model: LogModel

  @column()
  declare modelId: string | undefined

  @column()
  declare data: object | object[] | undefined

  @column()
  declare userId: number

  @column()
  declare state: LogState | undefined

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  public static ensurePublicId(log: Log) {
    if (!log.publicId) {
      log.publicId = nanoid()
    }
  }

  public static async createLog(
    action: LogAction,
    model: LogModel,
    userId: number,
    data?: object | object[] | undefined,
    state?: LogState,
    modelId?: string
  ) {
    const log = new Log()
    log.action = action
    log.model = model
    log.modelId = modelId
    log.data = data
    log.userId = userId
    log.state = state

    return await log.save()
  }
}
