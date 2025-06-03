import { DateTime } from 'luxon'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import { LogExtension } from '../extensions/log_extension.js'
import { compose } from '@adonisjs/core/helpers'
import { ImageExtension } from '../extensions/image_extension.js'
import Book from '#models/book'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Track from '#models/track'

export default class Image extends compose(LogExtension, ImageExtension) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare image: string

  @column()
  declare bookId: number | null

  @column()
  declare trackId: number | null

  @belongsTo(() => Book)
  declare book: BelongsTo<typeof Book>

  @belongsTo(() => Track)
  declare track: BelongsTo<typeof Track>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
