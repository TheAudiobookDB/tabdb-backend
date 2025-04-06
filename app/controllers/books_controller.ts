// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { createBookValidator, getBookValidator } from '#validators/book_validator'
import Book from '#models/book'
import router from '@adonisjs/core/services/router'
import env from '#start/env'
import { randomUUID } from 'node:crypto'
import { BooksHelper } from '../helpers/books_helper.js'
import Genre from '#models/genre'
import Identifier from '#models/identifier'
import Author from '#models/author'
import Narrator from '#models/narrator'
import Track from '#models/track'
import Series from '#models/series'
import { DateTime } from 'luxon'
import {
  authorValidator,
  genreValidator,
  identifierValidator,
  narratorValidator,
  seriesValidator,
} from '#validators/provider_validator'
import { ModelObject } from '@adonisjs/lucid/types/model'

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
    book.publishedAt = payload.publishedAt ? DateTime.fromJSDate(payload.publishedAt) : null
    book.releasedAt = payload.releasedAt ? DateTime.fromJSDate(payload.releasedAt) : null
    book.isExplicit = payload.isExplicit ?? false
    book.isAbridged = payload.isAbridged ?? null
    book.type = payload.type ?? 'audiobook'
    book.groupId = payload.groupId ?? null

    await book.save()

    // Genres
    await BooksController.addGenreToBook(book, payload.genres)

    // Identifiers
    await BooksController.addIdentifierToBook(book, payload.identifiers)

    // Authors
    await BooksController.addAuthorToBook(book, payload.authors)

    await BooksController.addNarratorToBook(book, payload.narrators)

    // Tracks
    if (payload.tracks) {
      const tracks = []
      for (const track of payload.tracks) {
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

          const identifiers: Identifier[] = []
          for (const identifier of narrator.identifiers) {
            if ('id' in identifier && identifier.id) {
              const existingIdentifier = await Identifier.findBy('public_id', identifier.id)
              if (existingIdentifier) {
                identifiers.push(existingIdentifier)
              }
            } else if ('type' in identifier) {
              const existingIdentifier = await Identifier.firstOrCreate({
                type: identifier.type,
                value: identifier.value,
              })
              if (existingIdentifier) {
                identifiers.push(existingIdentifier)
              }
            }
          }
          await narratorModel.related('identifiers').saveMany(identifiers)
        }
      }
      await book.related('narrators').attach(roles)
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

          const identifiers: Identifier[] = []
          for (const identifier of author.identifiers) {
            if ('id' in identifier && identifier.id) {
              const existingIdentifier = await Identifier.findBy('public_id', identifier.id)
              if (existingIdentifier) {
                identifiers.push(existingIdentifier)
              }
            } else if ('type' in identifier) {
              const existingIdentifier = await Identifier.firstOrCreate({
                type: identifier.type,
                value: identifier.value,
              })
              if (existingIdentifier) {
                identifiers.push(existingIdentifier)
              }
            }
          }
          await authorModel.related('identifiers').saveMany(identifiers)
        }
      }
      await book.related('authors').saveMany(authors)
    }
  }

  static async addIdentifierToBook(book: Book, payloadObject?: object[]) {
    if (payloadObject) {
      const identifiers = []
      for (const payload of payloadObject) {
        const identifier = await identifierValidator.validate(payload)
        if ('id' in identifier && identifier.id) {
          const existingIdentifier = await Identifier.findBy('public_id', identifier.id)
          if (existingIdentifier) {
            identifiers.push(existingIdentifier)
          }
        } else if ('type' in identifier) {
          const existingIdentifier = await Identifier.firstOrCreate({
            type: identifier.type,
            value: identifier.value,
          })
          if (existingIdentifier) {
            identifiers.push(existingIdentifier)
          }
        }
      }
      await book.related('identifiers').saveMany(identifiers)
    }
  }

  static async addSeriesToBook(book: Book, payloadObject?: object[]) {
    if (payloadObject) {
      const series = []
      const positions: Record<string, ModelObject> = {}
      for (const payload of payloadObject) {
        const serie = await seriesValidator.validate(payload)
        if (serie.id) {
          const existingSeries = await Series.findBy('public_id', serie.id)
          if (existingSeries) {
            series.push(existingSeries)
          }
        } else {
          const existingSeries = await Series.firstOrCreate(
            { name: serie.name },
            {
              description: serie.description,
            }
          )
          if (existingSeries) {
            series.push(existingSeries)
          }
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

          const identifiers: Identifier[] = []
          for (const identifier of serie.identifiers) {
            if ('id' in identifier && identifier.id) {
              const existingIdentifier = await Identifier.findBy('public_id', identifier.id)
              if (existingIdentifier) {
                identifiers.push(existingIdentifier)
              }
            } else if ('type' in identifier) {
              const existingIdentifier = await Identifier.firstOrCreate({
                type: identifier.type,
                value: identifier.value,
              })
              if (existingIdentifier) {
                identifiers.push(existingIdentifier)
              }
            }
          }
          await seriesModel.related('identifiers').saveMany(identifiers)
        }
      }
      await book.related('series').attach(positions)
    }
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
