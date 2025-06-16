import { DateTime } from 'luxon'
import {
  afterCreate,
  afterDelete,
  afterFetch,
  afterFind,
  afterUpdate,
  belongsTo,
  column,
  hasMany,
  manyToMany,
  scope,
} from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Contributor from '#models/contributor'
import Genre from '#models/genre'
import Identifier from '#models/identifier'
import Series from '#models/series'
import Track from '#models/track'
import BookGroup from '#models/book_group'
import { bookIndex } from '#config/meilisearch'
import { SearchEngineHelper } from '../helpers/search_engine.js'
import Publisher from '#models/publisher'
import { LogExtension } from '../extensions/log_extension.js'
import { ImageExtension } from '../extensions/image_extension.js'
import { compose } from '@adonisjs/core/helpers'
import { LogState } from '../enum/log_enum.js'
import { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import Image from '#models/image'
import logger from '@adonisjs/core/services/logger'

type Builder = ModelQueryBuilderContract<typeof Book>

export default class Book extends compose(LogExtension, ImageExtension) {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column()
  // @example(Harry Potter and the Philosopher's Stone)
  declare title: string

  @column()
  // @example(Harry Potter 1)
  declare subtitle: string | null

  @column()
  // @example(Short summary of the book)
  declare summary: string | null

  @column()
  // @example(Longer more detailed description of the book)
  declare description: string | null

  @column()
  // @example(https://example.com/image.jpg)
  declare image: string | null

  @column()
  // @example(English)
  declare language: string | null

  @column()
  // @example(©1997 J.K. Rowling (P)2011 Der Hörverlag in der Verlagsgruppe Random House GmbH)
  declare copyright: string | null

  @column()
  // @example(123)
  declare pages: number | null

  @column()
  // @props({"description": "The duration of the book (in seconds) if type is audiobook or podcast."})
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

  @manyToMany(() => Contributor, {
    pivotColumns: ['type', 'role'],
  })
  declare contributors: ManyToMany<typeof Contributor>

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

  @column({ serializeAs: null })
  declare public publisher_id: number

  @belongsTo(() => Publisher, {
    foreignKey: 'publisher_id',
  })
  declare public publisher: BelongsTo<typeof Publisher>

  @hasMany(() => Image, {
    foreignKey: 'bookId',
  })
  declare images: HasMany<typeof Image>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  private static buildSearchDocument(book: Book) {
    if (!book || !book.id || !book.title) {
      logger.warn('Book is missing, cannot build search document')
    }
    return {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle,
      description: SearchEngineHelper.removeHtmlTags(book.summary),
      type: book.type,
      duration: book.duration,
      pages: book.pages,
      releasedAt: book.releasedAt ? book.releasedAt.toUnixInteger() : null,
      isExplicit: book.isExplicit,
      isAbridged: book.isAbridged,
      publisher: book.publisher,
      contributors: book.contributors
        ? book.contributors.map((contributor) => ({
            name: contributor.name,
            type: contributor.$extras.pivot_type,
          }))
        : null,
      genres: book.genres ? book.genres.map((genre) => genre.name) : null,
      series: book.series
        ? book.series.map((serie) => {
            return {
              name: serie.name,
              position: serie.$extras.pivot_position ? serie.$extras.pivot_position : null,
            }
          })
        : null,
      language: book.language
        ? {
            language: book.language.split('-')[0],
            code: book.language.includes('-') ? book.language.split('-')[1] : null,
          }
        : null,
    }
  }

  private static async fetchBookWithRelations(book: Book): Promise<Book> {
    const bookRelations: Book | null =
      (await Book.query()
        .where('id', book.id)
        .preload('contributors', (q) => q.pivotColumns(['role', 'type']))
        .preload('genres')
        .preload('series')
        .preload('publisher')
        .first()) || book

    if (!bookRelations) {
      throw new Error(`Book with id ${book.id} not found`)
    }

    return bookRelations
  }

  private static async processSearchIndex(book: Book, action: 'add' | 'update'): Promise<void> {
    if (book.enabled) {
      const fetchedBook = await this.fetchBookWithRelations(book)
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

  @afterFind()
  // @ts-ignore
  public static async afterFindHook(book: Book) {}

  @afterFetch()
  // @ts-ignore
  public static async afterFetchHook(book: Book) {}

  // Function to enable book and disabled relations
  public static async enableBookAndRelations(bookId: number): Promise<void> {
    const book = await Book.findOrFail(bookId)
    book.enabled = true
    await book.saveWithLog(LogState.APPROVED)

    const fetchedBook = await this.fetchBookWithRelations(book)

    for (const contributor of fetchedBook.contributors) {
      if (!contributor.enabled) {
        contributor.enabled = true
        await contributor.saveWithLog(LogState.APPROVED)
      }
    }
    for (const genre of fetchedBook.genres) {
      if (!genre.enabled) {
        genre.enabled = true
        await genre.saveWithLog(LogState.APPROVED)
      }
    }
    for (const serie of fetchedBook.series) {
      if (!serie.enabled) {
        serie.enabled = true
        await serie.saveWithLog(LogState.APPROVED)
      }
    }
    const publisher: Publisher | undefined = fetchedBook.publisher
    if (publisher && !publisher.enabled) {
      publisher.enabled = true
      await publisher.saveWithLog(LogState.APPROVED)
    }
  }

  static minimalAll = scope((query: Builder) => {
    query
      .withScopes((s) => s.minimalContributors())
      .withScopes((s) => s.minimalSeries())
      .withScopes((s) => s.minimalPublisher())
      .preload('genres')
      .preloadOnce('identifiers')
      .preloadOnce('group')
  })

  static fullAll = scope((query: Builder) => {
    query
      .withScopes((s) => s.fullContributors())
      .withScopes((s) => s.fullSeries())
      .withScopes((s) => s.fullPublisher())
      .preloadOnce('genres')
      .preloadOnce('identifiers')
      .preloadOnce('group')
      .preloadOnce('tracks')
      .preloadOnce('images')
  })

  static minimalContributors = scope((query: Builder) => {
    query.preload('contributors', (q) =>
      q.pivotColumns(['role', 'type']).withScopes((s) => s.minimal())
    )
  })

  static fullContributors = scope((query: Builder) => {
    query.preload('contributors', (q) =>
      q.pivotColumns(['role', 'type']).withScopes((s) => s.full())
    )
  })

  static minimalSeries = scope((query: Builder) => {
    query.preload('series', (q) => q.pivotColumns(['position']).withScopes((s) => s.minimal()))
  })

  static fullSeries = scope((query: Builder) => {
    query.preload('series', (q) => q.pivotColumns(['position']).withScopes((s) => s.full()))
  })

  static minimalPublisher = scope((query: Builder) => {
    query.preload('publisher', (q) => q.withScopes((s) => s.minimal()))
  })

  static fullPublisher = scope((query: Builder) => {
    query.preload('publisher', (q) => q.withScopes((s) => s.full()))
  })
}
