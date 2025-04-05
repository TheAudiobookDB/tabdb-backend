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
    book.pages = payload.pages ?? null
    book.duration = payload.duration ?? null
    book.publishedAt = payload.publishedAt ? DateTime.fromJSDate(payload.publishedAt) : null
    book.releasedAt = payload.releasedAt ? DateTime.fromJSDate(payload.releasedAt) : null
    book.isExplicit = payload.isExplicit ?? false
    book.isAbridged = payload.isAbridged ?? null
    book.type = payload.type ?? 'audiobook'
    book.groupId = payload.groupId ?? null

    await book.save()

    // Genres
    if (payload.genres) {
      const genres = []
      for (const genre of payload.genres) {
        if (genre.id) {
          const existingGenre = await Genre.find(genre.id)
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

    // Identifiers
    if (payload.identifiers) {
      const identifiers = []
      for (const identifier of payload.identifiers) {
        if ('id' in identifier && identifier.id) {
          const existingIdentifier = await Identifier.find(identifier.id)
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

    // Authors
    if (payload.authors) {
      const authors = []
      for (const author of payload.authors) {
        if (author.id) {
          const existingAuthor = await Author.find(author.id)
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
      }
      await book.related('authors').saveMany(authors)
    }

    // Narrators
    if (payload.narrators) {
      const narrators = []
      for (const narrator of payload.narrators) {
        if (narrator.id) {
          const existingNarrator = await Narrator.find(narrator.id)
          if (existingNarrator) {
            narrators.push(existingNarrator)
          }
        } else {
          const existingNarrator = await Narrator.firstOrCreate(
            { name: narrator.name },
            {
              description: narrator.description,
              role: narrator.role,
            }
          )
          if (existingNarrator) {
            narrators.push(existingNarrator)
          }
        }
      }
      await book.related('narrators').saveMany(narrators)
    }

    // Tracks
    if (payload.tracks) {
      const tracks = []
      for (const track of payload.tracks) {
        if (track.id) {
          const existingTrack = await Track.find(track.id)
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
    if (payload.series) {
      const series = []
      for (const serie of payload.series) {
        if (serie.id) {
          const existingSeries = await Series.find(serie.id)
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
      }
      await book.related('series').saveMany(series)
    }

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
      .where('id', params.id)
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
