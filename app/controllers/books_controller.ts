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
import { Infer } from '@vinejs/vine/types'
import app from '@adonisjs/core/services/app'
import { cuid } from '@adonisjs/core/helpers'

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

    if (payload.identifiers && payload.identifiers.length > 0) {
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

    let image = context.request.file('image')
    if (image) {
      await image.move(app.makePath('storage/uploads'), {
        name: `${cuid()}.${image.extname}`,
      })
    }

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

  static async addGenreToBook(book: Book, payloadObject?: Infer<typeof genreValidator>[]) {
    if (payloadObject) {
      const genres = []
      for (const genre of payloadObject) {
        const genreModel = await Genre.findByModelOrCreate(genre)
        if (genreModel) genres.push(genreModel)
      }
      await book.related('genres').saveMany(genres)
    }
  }

  static async addNarratorToBook(book: Book, payloadObject?: Infer<typeof narratorValidator>[]) {
    if (payloadObject) {
      const roles: Record<string, ModelObject> = {}
      for (const narrator of payloadObject) {
        const narratorModel = await Narrator.findByModelOrCreate(narrator)
        const role = narrator.role
        if (role) {
          roles[narratorModel.id] = { role }
        } else {
          roles[narratorModel.id] = {}
        }
      }
      await book.related('narrators').sync(roles)
    }
  }

  static async addAuthorToBook(book: Book, payloadObject?: Infer<typeof authorValidator>[]) {
    if (payloadObject) {
      const authors = []
      for (const author of payloadObject) {
        const authorModel = await Author.findByModelOrCreate(author)
        if (authorModel) authors.push(authorModel)
      }
      await book.related('authors').saveMany(authors)
    }
  }

  static async addSeriesToBook(book: Book, payloadObject?: Infer<typeof seriesValidator>[]) {
    if (payloadObject) {
      const positions: Record<string, ModelObject> = {}
      for (const serie of payloadObject) {
        const serieModel = await Series.findByModelOrCreate(serie)

        const position = serie.position
        if (position) {
          positions[serieModel.id] = { position }
        } else {
          positions[serieModel.id] = {}
        }
      }
      await book.related('series').sync(positions)
    }
  }

  static async addTrackToBook(book: Book, payloadObject?: Infer<typeof trackValidator>[]) {
    if (payloadObject) {
      const tracks = []
      for (const track of payloadObject) {
        const trackModel = await Track.findByModelOrCreate(track, book)
        if (trackModel) {
          tracks.push(trackModel)
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
