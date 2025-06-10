import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'
import { LogExtension } from '../extensions/log_extension.js'

export default class ImageTemp extends LogExtension {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare ip: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
