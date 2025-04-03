import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Log extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare old_data: string | null

  @column()
  declare new_data: string | null

  @column()
  declare action: 'create' | 'update' | 'delete'

  @column()
  declare entity:
    | 'book'
    | 'book_identifier'
    | 'book_genre'
    | 'book_narrator'
    | 'book_series'
    | 'genre'
    | 'identifier'
    | 'narrator'
    | 'series'

  @column()
  declare entity_id: number

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
