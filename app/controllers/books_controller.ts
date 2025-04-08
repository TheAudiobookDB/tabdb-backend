// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { createBookValidator, getBookValidator } from '#validators/book_validator'
import Book from '#models/book'
import router from '@adonisjs/core/services/router'
import env from '#start/env'
import { randomUUID } from 'node:crypto'
import { BooksHelper } from '../helpers/books_helper.js'
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
  async create({ request }: HttpContext) {
    const payload = await request.validateUsing(createBookValidator)

    const foundBooks = await BooksHelper.findBooks(request, 3, true)

    const book = new Book()

    book.title = payload.title
    book.subtitle = payload.subtitle ?? null
    book.summary = payload.summary ?? null
    book.description = payload.description ?? null
    book.publisher = payload.publisher ?? null
    book.language = payload.language ?? null
    book.copyright = payload.copyright ?? null
    book.page = payload.page ?? null
    book.duration = payload.duration ?? null
    book.releasedAt = payload.releasedAt ? DateTime.fromJSDate(payload.releasedAt) : null
    book.isExplicit = payload.isExplicit ?? false
    book.isAbridged = payload.isAbridged ?? null
    book.type = payload.type ?? 'audiobook'
    book.groupId = payload.groupId ?? null

    await book.save()

    // Genres
    await BooksController.addGenreToBook(book, payload.genres)

    // Identifiers
    await ModelHelper.addIdentifier(book, payload.identifiers)

    // Authors
    await BooksController.addAuthorToBook(book, payload.authors)

    await BooksController.addNarratorToBook(book, payload.narrators)

    // Tracks
    await BooksController.addTrackToBook(book, payload.tracks)

    // Series
    await BooksController.addSeriesToBook(book, payload.series)

    if (foundBooks && foundBooks.length > 0) {
      const url = router
        .builder()
        .prefixUrl(env.get('APP_URL'))
        .qs({ uuid: randomUUID(), model: 'book', id: book.id })
        .disableRouteLookup()
        .makeSigned('/create/confirm', { expiresIn: '24h', purpose: 'login' })

      return {
        message:
          'There has been at least one book that looks the same. Please verify the books to see if they are the same.',
        books: foundBooks.all(),
        url,
      }
    }

    book.enabled = true

    await book.save()

    return { book }
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
