import { DateTime } from 'luxon'
import {
  afterCreate,
  afterDelete,
  afterUpdate,
  BaseModel,
  beforeCreate,
  belongsTo,
  column,
  hasMany,
  manyToMany,
} from '@adonisjs/lucid/orm'
import Author from '#models/author'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Narrator from '#models/narrator'
import Genre from '#models/genre'
import Identifier from '#models/identifier'
import Series from '#models/series'
import Track from '#models/track'
import BookGroup from '#models/book_group'
import { nanoid } from '#config/app'
import { bookIndex } from '#config/meilisearch'
import { SearchEngineHelper } from '../helpers/search_engine.js'

export default class Book extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare publicId: string

  @column()
  declare title: string

  @column()
  declare subtitle: string | null

  @column()
  declare summary: string | null

  @column()
  declare description: string | null

  @column()
  declare publisher: string | null

  @column()
  declare image: string | null

  @column()
  declare language: string | null

  @column()
  declare copyright: string | null

  @column()
  declare pages: number | null

  @column()
  declare duration: number | null

  @column.dateTime()
  declare releasedAt: DateTime | null

  @column()
  declare isExplicit: boolean

  @column()
  declare isAbridged: boolean | null

  @column()
  declare groupId: number | null

  @column({ serializeAs: null })
  declare enabled: boolean

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null

  @column()
  // @enum(book, audiobook, podcast, e-book)
  declare type: 'book' | 'audiobook' | 'podcast' | 'e-book'

  @manyToMany(() => Author, {
    pivotTable: 'book_author',
  })
  declare authors: ManyToMany<typeof Author>

  @manyToMany(() => Narrator, {
    pivotColumns: ['role'],
  })
  declare narrators: ManyToMany<typeof Narrator>

  @manyToMany(() => Genre)
  declare genres: ManyToMany<typeof Genre>

  @manyToMany(() => Identifier)
  declare identifiers: ManyToMany<typeof Identifier>

  @manyToMany(() => Series, {
    pivotColumns: ['position'],
  })
  declare series: ManyToMany<typeof Series>

  @hasMany(() => Track, {
    foreignKey: 'bookId',
  })
  declare tracks: HasMany<typeof Track>

  @belongsTo(() => BookGroup, {
    foreignKey: 'groupId',
    localKey: 'id',
  })
  declare group: BelongsTo<typeof BookGroup>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  public static ensurePublicId(book: Book) {
    if (!book.publicId) {
      book.publicId = nanoid()
    }
  }

  private static buildSearchDocument(book: Book) {
    return {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle,
      description: SearchEngineHelper.removeHtmlTags(book.description),
      type: book.type,
      authors: book.authors ? book.authors.map((author) => author.name) : null,
      narrators: book.narrators ? book.narrators.map((narrator) => narrator.name) : null,
      genres: book.genres ? book.genres.map((genre) => genre.name) : null,
      series: book.series
        ? book.series.map((serie) => serie.name + (serie.position ? `${serie.position}` : ''))
        : null,
      language: book.language
        ? {
            language: book.language.split('-')[0],
            code: book.language.includes('-') ? book.language.split('-')[1] : null,
          }
        : null,
    }
  }

  private static async fetchBookWithRelations(bookId: number): Promise<Book> {
    return (await Book.query()
      .where('id', bookId)
      .preload('authors')
      .preload('narrators')
      .preload('genres')
      .preload('series')
      .first()) as Book
  }

  private static async processSearchIndex(book: Book, action: 'add' | 'update'): Promise<void> {
    if (book.enabled) {
      const fetchedBook = await this.fetchBookWithRelations(book.id)
      const doc = this.buildSearchDocument(fetchedBook)

      if (action === 'add') {
        void bookIndex.addDocuments([doc])
      } else {
        void bookIndex.updateDocuments([doc])
      }
    }
  }

  @afterCreate()
  public static async afterCreateHook(book: Book) {
    void this.processSearchIndex(book, 'add')
  }

  @afterUpdate()
  public static async afterUpdateHook(book: Book) {
    void this.processSearchIndex(book, 'update')
  }

  @afterDelete()
  public static async afterDeleteHook(book: Book) {
    void bookIndex.deleteDocument(book.id)
  }

  // Function to enable book and disabled relations
  public static async enableBookAndRelations(bookId: number): Promise<void> {
    const book = await Book.findOrFail(bookId)
    book.enabled = true
    await book.save()

    const fetchedBook = await this.fetchBookWithRelations(book.id)

    for (const author of fetchedBook.authors) {
      if (!author.enabled) {
        author.enabled = true
        await author.save()
      }
    }
    for (const narrator of fetchedBook.narrators) {
      if (!narrator.enabled) {
        narrator.enabled = true
        await narrator.save()
      }
    }
    for (const genre of fetchedBook.genres) {
      if (!genre.enabled) {
        genre.enabled = true
        await genre.save()
      }
    }
    for (const serie of fetchedBook.series) {
      if (!serie.enabled) {
        serie.enabled = true
        await serie.save()
      }
    }
  }
}
