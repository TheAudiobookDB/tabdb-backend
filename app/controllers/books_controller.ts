// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { createBookValidator, getBookValidator } from '#validators/book_validator'
import Book from '#models/book'
import Genre from '#models/genre'
import Contributor from '#models/contributor'
import Track from '#models/track'
import Series from '#models/series'
import { DateTime } from 'luxon'
import {
  contributorValidator,
  genreValidator,
  getIdPaginationValidator,
  publisherValidator,
  seriesValidator,
  trackValidator,
} from '#validators/provider_validator'
import { ModelObject } from '@adonisjs/lucid/types/model'
import { ModelHelper } from '../helpers/model_helper.js'
import { Audiobookshelf } from '../provider/audiobookshelf.js'
import { LogState } from '../enum/log_enum.js'
import { bookIndex } from '#config/meilisearch'
import router from '@adonisjs/core/services/router'
import env from '#start/env'
import { Infer } from '@vinejs/vine/types'
import app from '@adonisjs/core/services/app'
import { cuid } from '@adonisjs/core/helpers'
import Publisher from '#models/publisher'
import { BookDto, SearchBookDto } from '#dtos/book'
import Image from '#models/image'
import { ImageBaseDto } from '#dtos/image'
import { getIdsValidator } from '#validators/common_validator'
import { ApiOperation, ApiTags } from '@foadonis/openapi/decorators'
import {
  limitApiQuery,
  nanoIdApiPathParameter,
  nanoIdsApiQuery,
  notFoundApiResponse,
  pageApiQuery,
  successApiResponse,
  tooManyRequestsApiResponse,
  validationErrorApiResponse,
} from '#config/openapi'
import { ImageBaseDtoPaginated } from '#dtos/pagination'
import NotFoundException from '#exceptions/not_found_exception'

@ApiTags('Book')
@validationErrorApiResponse()
@tooManyRequestsApiResponse()
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

    await book.saveWithLog(result.hits.length > 0 ? LogState.DUPLICATE_FOUND : LogState.PENDING)

    await BooksController.addGenreToBook(book, payload.genres)
    await ModelHelper.addIdentifier(book, payload.identifiers)
    await BooksController.addContributorToBook(book, payload.contributors)
    await BooksController.addTrackToBook(book, payload.tracks)
    await BooksController.addSeriesToBook(book, payload.series)
    await BooksController.addPublisherToBook(book, payload.publisher)

    const bookDto = new BookDto(book)

    if (result.hits.length > 0) {
      const url = router
        .builder()
        .prefixUrl(env.get('APP_URL'))
        .qs({ model: 'book', id: book.publicId })
        .disableRouteLookup()
        .makeSigned('/create/confirm', { expiresIn: '24h', purpose: 'login' })

      return {
        message: 'Book created, but a duplicate was found.',
        book: bookDto,
        confirmation: url,
        available: false,
      }
    }

    return { book: bookDto, message: 'Book created successfully.', available: false }
  }

  static async addGenreToBook(book: Book, payloadObject?: Infer<typeof genreValidator>[]) {
    if (payloadObject) {
      const genres = []
      for (const genre of payloadObject) {
        const genreModel = await Genre.findByModelOrCreate(genre)
        if (genreModel) genres.push(genreModel)
      }
      book.$pushRelated('genres', genres)
      await book.related('genres').saveMany(genres)
    }
  }

  static async addContributorToBook(
    book: Book,
    payloadObject?: Infer<typeof contributorValidator>[]
  ) {
    if (payloadObject) {
      const roles: Record<string, ModelObject> = {}

      if (!book.contributors) {
        await book.load('contributors', (q) => q.pivotColumns(['role', 'type']))
      }
      if (book.contributors && book.contributors.length > 0) {
        for (const contributor of book.contributors) {
          if (contributor.$extras.pivot_role) {
            roles[contributor.id] = {
              role: contributor.$extras.pivot_role,
              type: contributor.$extras.pivot_type,
            }
          } else {
            roles[contributor.id] = { type: contributor.$extras.pivot_type }
          }
        }
      }

      for (const narrator of payloadObject) {
        const narratorModel = await Contributor.findByModelOrCreate(narrator)
        const role = narrator.role
        const type = narrator.type
        if (role) {
          roles[narratorModel.id] = { role, type }
        } else {
          roles[narratorModel.id] = { type }
        }
      }
      await book.related('contributors').sync(roles)
    }
  }

  static async addSeriesToBook(book: Book, payloadObject?: Infer<typeof seriesValidator>[]) {
    if (payloadObject) {
      const positions: Record<string, ModelObject> = {}

      if (!book.series) {
        await book.load('series', (q) => q.pivotColumns(['position']))
      }
      if (book.series && book.series.length > 0) {
        for (const serie of book.series) {
          if (serie.$extras.pivot_position) {
            positions[serie.id] = { position: serie.$extras.pivot_position }
          } else {
            positions[serie.id] = {}
          }
        }
      }

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
      book.$pushRelated('tracks', tracks)
      await book.related('tracks').saveMany(tracks)
    }
  }

  static async addPublisherToBook(
    book: Book,
    publisher?: Infer<typeof publisherValidator>,
    replace = false
  ) {
    if (publisher) {
      if (book.publisher_id && !replace) return
      const publisherModel = await Publisher.findByModelOrCreate(publisher)
      if (publisherModel) {
        book.$setRelated('publisher', publisherModel)
        await book.related('publisher').associate(publisherModel)
      }
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
    const absBook = await Audiobookshelf.fetchBook(request.body())

    return new BookDto(absBook)
  }

  @ApiOperation({
    summary: 'Get a Book by ID',
    description:
      'Gets a book by ID and preloads its authors, narrators, genres, identifiers, series, tracks, and group.',
    operationId: 'getBook',
  })
  @nanoIdApiPathParameter()
  @notFoundApiResponse()
  @successApiResponse({ type: BookDto, status: 200 })
  async get({ params }: HttpContext) {
    await getBookValidator.validate(params)

    const book: Book = await Book.query()
      .where('public_id', params.id)
      .withScopes((s) => s.fullAll())
      .firstOrFail()

    return new BookDto(book)
  }

  @ApiOperation({
    summary: 'Get multiple Books by IDs',
    description:
      'Gets multiple books by IDs. This only returns minified versions. If you want the full version, use the `get` endpoint.',
    operationId: 'getBooks',
  })
  @nanoIdsApiQuery()
  @notFoundApiResponse()
  @successApiResponse({ type: [SearchBookDto], status: 200 })
  async getMultiple({ request }: HttpContext) {
    const payload = await getIdsValidator.validate(request.qs())

    const books: Book[] = await Book.query()
      .whereIn('public_id', payload.ids)
      .withScopes((s) => s.minimalAll())

    books.forEach((book) => {
      void Book.afterFindHook(book)
    })

    if (!books || books.length === 0) throw new NotFoundException()

    return SearchBookDto.fromArray(books)
  }

  @ApiOperation({
    summary: 'Get all additional images for a book by ID',
    description: 'Get all additional images for a book by ID',
    operationId: 'getBookImages',
    tags: ['Image'],
  })
  @nanoIdApiPathParameter()
  @pageApiQuery()
  @limitApiQuery()
  @notFoundApiResponse()
  @successApiResponse({ type: ImageBaseDtoPaginated, status: 200 })
  async images({ params }: HttpContext) {
    const payload = await getIdPaginationValidator.validate(params)

    const images = await Image.query()
      .preload('book', (q) => q.where('public_id', payload.id))
      .paginate(payload.page ?? 1, payload.limit ?? 10)

    if (!images || images.length === 0) throw new NotFoundException()

    return ImageBaseDto.fromPaginator(images)
  }
}
