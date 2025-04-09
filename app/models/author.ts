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
import Identifier from '#models/identifier'
import { nanoid } from '#config/app'
import { authorIndex } from '#config/meilisearch'
import { SearchEngineHelper } from '../helpers/search_engine.js'

export default class Author extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare publicId: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare image: string | null

  @column()
  declare enabled: boolean

  @manyToMany(() => Book, {
    pivotTable: 'book_author',
  })
  declare books: ManyToMany<typeof Book>

  @manyToMany(() => Identifier)
  declare identifiers: ManyToMany<typeof Identifier>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  public static ensurePublicId(author: Author) {
    if (!author.publicId) {
      author.publicId = nanoid()
    }
  }

  @afterCreate()
  public static async afterCreateHook(author: Author) {
    if (!author.enabled) return
    void authorIndex.addDocuments([
      {
        id: author.id,
        name: author.name,
        description: SearchEngineHelper.removeHtmlTags(author.description),
      },
    ])
  }

  @afterUpdate()
  public static async afterUpdateHook(author: Author) {
    if (!author.enabled) return
    void authorIndex.updateDocuments([
      {
        id: author.id,
        name: author.name,
        description: SearchEngineHelper.removeHtmlTags(author.description),
      },
    ])
  }
}
