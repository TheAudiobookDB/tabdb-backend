import { DateTime } from 'luxon'
import {
  afterCreate,
  afterUpdate,
  BaseModel,
  beforeCreate,
  column,
  manyToMany,
} from '@adonisjs/lucid/orm'
import Book from '#models/book'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import { nanoid } from '#config/app'
import { genreIndex } from '#config/meilisearch'

export default class Genre extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare publicId: string

  @column()
  declare name: string

  @column()
  declare type: 'genre' | 'tag'

  @column()
  declare enabled: boolean

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
}
