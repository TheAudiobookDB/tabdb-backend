import { DateTime } from 'luxon'
import { afterCreate, afterUpdate, beforeCreate, column, manyToMany } from '@adonisjs/lucid/orm'
import Book from '#models/book'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import { nanoid } from '#config/app'
import { genreIndex } from '#config/meilisearch'
import { Infer } from '@vinejs/vine/types'
import { genreValidator } from '#validators/provider_validator'
import { LogExtension } from '../extensions/log_extension.js'

export default class Genre extends LogExtension {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare publicId: string

  @column()
  declare name: string

  @column()
  declare type: 'genre' | 'tag'

  @column({ serializeAs: null })
  declare enabled: boolean

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null

  @manyToMany(() => Book)
  declare books: ManyToMany<typeof Book>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  public static ensurePublicId(genre: Genre) {
    if (!genre.publicId) {
      genre.publicId = nanoid()
    }
  }

  @afterCreate()
  public static async afterCreateHook(genre: Genre) {
    if (!genre.enabled) return
    void genreIndex.addDocuments([
      {
        id: genre.publicId,
        name: genre.name,
        type: genre.type,
      },
    ])
  }

  @afterUpdate()
  public static async afterUpdateHook(genre: Genre) {
    if (!genre.enabled) return
    void genreIndex.updateDocuments([
      {
        id: genre.publicId,
        name: genre.name,
        type: genre.type,
      },
    ])
  }

  public static async findByModelOrCreate(genre: Infer<typeof genreValidator>) {
    if ('id' in genre && genre.id) {
      const existingGenre = await Genre.findBy('public_id', genre.id)
      if (existingGenre) {
        return existingGenre
      }
    }
    if ('name' in genre && genre.name && 'type' in genre && genre.type) {
      const existingGenre = await Genre.firstOrCreate({
        name: genre.name,
        type: genre.type,
      })
      if (existingGenre) {
        return existingGenre
      }
    }
    return undefined
  }
}
