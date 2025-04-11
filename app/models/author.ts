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
import { Infer } from '@vinejs/vine/types'
import { authorValidator } from '#validators/provider_validator'
import { ModelHelper } from '../helpers/model_helper.js'

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

  @column({ serializeAs: null })
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

  public static async findByModelOrCreate(author: Infer<typeof authorValidator>) {
    let currentAuthor: Author | null = null
    if (author.id) {
      currentAuthor = await Author.findBy('public_id', author.id)
    }
    if (!currentAuthor && author.identifiers && author.identifiers.length > 0) {
      const tmp = (await ModelHelper.findByIdentifiers(Author, author.identifiers)) as
        | Author[]
        | null
      if (tmp && tmp.length > 0) currentAuthor = tmp[0]
    }
    if (!currentAuthor) {
      currentAuthor = await Author.firstOrCreate(
        { name: author.name },
        {
          description: author.description,
        }
      )
      await ModelHelper.addIdentifier(currentAuthor, author.identifiers)
    }

    return currentAuthor
  }
}
