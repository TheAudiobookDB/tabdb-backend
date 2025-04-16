import { DateTime } from 'luxon'
import { beforeCreate, column, manyToMany } from '@adonisjs/lucid/orm'
import Book from '#models/book'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import { nanoid } from '#config/app'
import { LogExtension } from '../extensions/log_extension.js'

export default class Identifier extends LogExtension {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare publicId: string

  @column()
  declare value: string

  @column()
  declare type: 'audible:asin' | 'amazon:asin' | 'isbn10' | 'isbn13' | 'ean'

  @manyToMany(() => Book)
  declare books: ManyToMany<typeof Book>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  public static ensurePublicId(identifier: Identifier) {
    if (!identifier.publicId) {
      identifier.publicId = nanoid()
    }
  }
}
