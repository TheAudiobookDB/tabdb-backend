import { DateTime } from 'luxon'
import { beforeCreate, column, hasMany } from '@adonisjs/lucid/orm'
import Book from '#models/book'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { nanoid } from '#config/app'
import { LogExtension } from '../extensions/log_extension.js'

export default class BookGroup extends LogExtension {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare publicId: string

  @column()
  declare name: string

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null

  @hasMany(() => Book)
  declare books: HasMany<typeof Book>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  public static ensurePublicId(bookGroup: BookGroup) {
    if (!bookGroup.publicId) {
      bookGroup.publicId = nanoid()
    }
  }
}
