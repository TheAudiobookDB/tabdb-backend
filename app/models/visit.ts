import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { IntervalType } from '../enum/interval_enum.js'

export default class Visit extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare trackableType: string

  @column()
  declare trackableId: string

  @column()
  declare intervalType: IntervalType

  @column()
  declare visitCount: number

  @column.date()
  declare intervalStartDate: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
