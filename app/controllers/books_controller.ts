// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { createBookValidator, getBookValidator } from '#validators/book_validator'
import Book from '#models/book'
import Genre from '#models/genre'
import Author from '#models/author'
import Narrator from '#models/narrator'
import Track from '#models/track'
import Series from '#models/series'
import { DateTime } from 'luxon'
import {
  authorValidator,
  genreValidator,
  narratorValidator,
  seriesValidator,
  trackValidator,
} from '#validators/provider_validator'
import { ModelObject } from '@adonisjs/lucid/types/model'
import { ModelHelper } from '../helpers/model_helper.js'
import { Audiobookshelf } from '../provider/audiobookshelf.js'
import { LogAction, LogModel, LogState } from '../enum/log_enum.js'
import Log from '#models/log'
import { bookIndex } from '#config/meilisearch'
import router from '@adonisjs/core/services/router'
import env from '#start/env'

export default class BooksController {
  /**
   * @create
   * @operationId createBook
   * @summary Create a new book
   * @description Creates a new book and (optionally) its relations (authors, narrators, genres, identifiers, series, tracks).
   *
   * @requestBody - <createBookValidator>
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async create(context: HttpContext) {
    const payload = await context.request.validateUsing(createBookValidator)

    if (payload.identifiers && payload.identifiers.length > 0) {
      const exactDuplicates = await Book.query()
        .where((builder) => {
          builder.where('title', payload.title)
          if (payload.subtitle) {
            builder.where('subtitle', payload.subtitle)
          }
          if (payload.language) {
            builder.where('language', payload.language)
          }
        })
        .first()

      if (exactDuplicates) {
        return context.response.status(422).send({
          message: 'A book with the same title, subtitle and language already exists.',
        })
      }

      // @ts-ignore
      const existingBooks = (await ModelHelper.findByIdentifiers(Book, payload.identifiers)) as
        | Book[]
        | null

      if (existingBooks && existingBooks.length > 0) {
        return context.response.status(422).send({
          message: 'A book with at least one identifier already exists.',
        })
      }
    }

    const searchTitle = payload.title + (payload.subtitle ? ` ${payload.subtitle}` : '')
    const result = await bookIndex.search(searchTitle, {
      attributesToSearchOn: ['title', 'subtitle'],
      attributesToRetrieve: ['id'],
      limit: 3,
      rankingScoreThreshold: 0.8,
    })

    const book = new Book()

    book.title = payload.title
    book.subtitle = payload.subtitle ?? null
    book.summary = payload.summary ?? null
    book.description = payload.description ?? null
    book.publisher = payload.publisher ?? null
    book.language = payload.language ?? null
    book.copyright = payload.copyright ?? null
    book.pages = payload.pages ?? null
    book.duration = payload.duration ?? null
    book.releasedAt = payload.releasedAt ? DateTime.fromJSDate(payload.releasedAt) : null
    book.isExplicit = payload.isExplicit ?? false
    book.isAbridged = payload.isAbridged ?? null
    book.type = payload.type ?? 'audiobook'
    book.groupId = payload.groupId ?? null

    await book.save()

    await Log.createLog(
      LogAction.CREATE,
      LogModel.BOOK,
      context.auth.getUserOrFail().id,
      undefined,
      result.hits.length > 0 ? LogState.DUPLICATE_FOUND : LogState.PENDING,
      book.publicId
    )

    await BooksController.addGenreToBook(book, payload.genres)
    await ModelHelper.addIdentifier(book, payload.identifiers)
    await BooksController.addAuthorToBook(book, payload.authors)
    await BooksController.addNarratorToBook(book, payload.narrators)
    await BooksController.addTrackToBook(book, payload.tracks)
    await BooksController.addSeriesToBook(book, payload.series)

    await book.save()

    if (result.hits.length > 0) {
      const url = router
        .builder()
        .prefixUrl(env.get('APP_URL'))
        .qs({ model: 'book', id: book.publicId })
        .disableRouteLookup()
        .makeSigned('/create/confirm', { expiresIn: '24h', purpose: 'login' })

      return {
        message: 'Book created, but a duplicate was found.',
        book,
        confirmation: url,
        available: true,
      }
    }

    return { book, message: 'Book created successfully.', available: false }
  }

  static async addGenreToBook(book: Book, payloadObject?: object[]) {
    if (payloadObject) {
      const genres = []
      for (const payload of payloadObject) {
        const genre = await genreValidator.validate(payload)
        if (genre.id) {
          const existingGenre = await Genre.findBy('public_id', genre.id)
          if (existingGenre) {
            genres.push(existingGenre)
          }
        } else {
          const existingGenre = await Genre.firstOrCreate({ name: genre.name, type: genre.type })
          if (existingGenre) {
            genres.push(existingGenre)
          }
        }
      }
      await book.related('genres').saveMany(genres)
    }
  }

  static async addNarratorToBook(book: Book, payloadObject?: object[]) {
    if (payloadObject) {
      const narrators = []
      const roles: Record<string, ModelObject> = {}
      for (const payload of payloadObject) {
        const narrator = await narratorValidator.validate(payload)
        if (narrator.id) {
          const existingNarrator = await Narrator.findBy('public_id', narrator.id)
          if (existingNarrator) {
            narrators.push(existingNarrator)
          }
        } else {
          const existingNarrator = await Narrator.firstOrCreate(
            { name: narrator.name },
            {
              description: narrator.description,
            }
          )
          if (existingNarrator) {
            narrators.push(existingNarrator)
          }
        }
        const narratorId = narrators[narrators.length - 1].id
        const role = narrator.role
        if (role) {
          roles[narratorId] = { role }
        } else {
          roles[narratorId] = {}
        }
        if (narrators.length > 0 && narrator.identifiers) {
          const narratorModel: Narrator = narrators[narrators.length - 1]

          await ModelHelper.addIdentifier(narratorModel, narrator.identifiers)
        }
      }
      await book.related('narrators').sync(roles)
    }
  }

  static async addAuthorToBook(book: Book, payloadObject?: object[]) {
    if (payloadObject) {
      const authors = []
      for (const payload of payloadObject) {
        const author = await authorValidator.validate(payload)
        if (author.id) {
          const existingAuthor = await Author.findBy('public_id', author.id)
          if (existingAuthor) {
            authors.push(existingAuthor)
          }
        } else {
          const existingAuthor = await Author.firstOrCreate(
            { name: author.name },
            {
              description: author.description,
            }
          )
          if (existingAuthor) {
            authors.push(existingAuthor)
          }
        }
        if (authors.length > 0 && author.identifiers) {
          const authorModel: Author = authors[authors.length - 1]

          await ModelHelper.addIdentifier(authorModel, author.identifiers)
        }
      }
      await book.related('authors').saveMany(authors)
    }
  }

  static async addSeriesToBook(book: Book, payloadObject?: object[]) {
    if (payloadObject) {
      const series = []
      const positions: Record<string, ModelObject> = {}
      for (const payload of payloadObject) {
        const serie = await seriesValidator.validate(payload)
        let existingSeries: Series | null = null
        if (serie.id) {
          existingSeries = await Series.findBy('public_id', serie.id)
          if (existingSeries) {
            series.push(existingSeries)
          }
        }

        if (!existingSeries && serie.identifiers) {
          const identifiers = serie.identifiers
          for (const identifier of identifiers) {
            const result = (await ModelHelper.findByIdentifier(
              Series,
              undefined,
              undefined,
              identifier
            )) as Series[]
            if (result && result.length > 0) {
              series.push(result[0])
              break
            }
          }
        }

        if (!existingSeries && serie.name) {
          existingSeries = await Series.firstOrCreate(
            { name: serie.name },
            {
              description: serie.description,
            }
          )
        }

        if (existingSeries) {
          series.push(existingSeries)
        }

        const seriesId = series[series.length - 1].id
        const position = serie.position
        if (position) {
          positions[seriesId] = { position }
        } else {
          positions[seriesId] = {}
        }
        if (series.length > 0 && serie.identifiers) {
          const seriesModel: Series = series[series.length - 1]

          await ModelHelper.addIdentifier(seriesModel, serie.identifiers)
        }
      }
      await book.related('series').sync(positions)
    }
  }

  static async addTrackToBook(book: Book, payloadObject?: object[]) {
    if (payloadObject) {
      const tracks = []
      for (const payload of payloadObject) {
        const track = await trackValidator.validate(payload)
        if (track.id) {
          const existingTrack = await Track.findBy('public_id', track.id)
          if (existingTrack) {
            tracks.push(existingTrack)
          }
        } else {
          const existingTrack = await Track.firstOrCreate(
            { name: track.name, bookId: book.id },
            {
              start: track.start,
              end: track.end,
            }
          )
          if (existingTrack) {
            tracks.push(existingTrack)
          }
        }
      }
      await book.related('tracks').saveMany(tracks)
    }
  }

  /**
   * @abs
   * @operationId createBookABS
   * @summary Create a new book from ABS
   * @description Creates a new book that supports the Audiobookshelf `metadata.json` format.
   *
   * @requestBody - <audiobookshelfValidator>
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Book>
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async abs({ request }: HttpContext) {
    const absBook = Audiobookshelf.fetchBook(request.body())

    return absBook
  }

  /**
   * @get
   * @operationId getBook
   * @summary Get a book by ID
   * @description Gets a book by ID and preloads its authors, narrators, genres, identifiers, series, tracks, and group.
   *
   * @requestBody - <getBookValidator>
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Book>.with(relations)
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async get({ params }: HttpContext) {
    await getBookValidator.validate(params)

    return await Book.query()
      .where('public_id', params.id)
      .preload('authors')
      .preload('narrators', (q) => q.pivotColumns(['role']))
      .preload('genres')
      .preload('identifiers')
      .preload('series', (q) => q.pivotColumns(['position']))
      .preload('tracks')
      .preload('group')
      .firstOrFail()
  }
}
