import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column, hasMany } from '@adonisjs/lucid/orm'
import Book from '#models/book'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { nanoid } from '#config/app'

export default class BookGroup extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare publicId: string

  @column()
  declare name: string

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
