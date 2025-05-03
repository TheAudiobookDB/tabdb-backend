import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, scope } from '@adonisjs/lucid/orm'
import { IntervalType } from '../enum/interval_enum.js'
import Book from '#models/book'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

type Builder = ModelQueryBuilderContract<typeof Visit>

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

  @belongsTo(() => Book, {
    foreignKey: 'public_id',
    localKey: 'trackable_id',
  })
  declare book: BelongsTo<typeof Book>

  @column.date()
  declare intervalStartDate: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Only visits with a visitCount greater than 10 are shown to prevent few visits and eventual tracking
  static minimal = scope((query: Builder) => {
    query
      .select(['intervalType', 'visitCount', 'intervalStartDate'])
      .where('visitCount', '>', 10)
      .where('interval_start_date', '>=', DateTime.now().minus({ year: 1 }).toJSDate())
  })

  static full = scope((query: Builder) => {
    query
      .where('visitCount', '>', 10)
      .where('interval_start_date', '>=', DateTime.now().minus({ year: 1 }).toJSDate())
  })
}
