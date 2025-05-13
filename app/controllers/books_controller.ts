// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getBookValidator } from '#validators/book_validator'
import Book from '#models/book'
import { DateTime } from 'luxon'
import { getIdPaginationValidator } from '#validators/provider_validator'
import { ModelHelper } from '../helpers/model_helper.js'
import { LogState } from '../enum/log_enum.js'
import { bookIndex } from '#config/meilisearch'
import router from '@adonisjs/core/services/router'
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { cuid } from '@adonisjs/core/helpers'
import { BookDto, SearchBookDto } from '#dtos/book'
import Image from '#models/image'
import { ImageBaseDto } from '#dtos/image'
import { getIdsValidator } from '#validators/common_validator'
import { ApiBody, ApiOperation, ApiTags } from '@foadonis/openapi/decorators'
import {
  forbiddenApiResponse,
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
import { createUpdateBookValidation } from '#validators/crud_validator'
import { BooksHelper } from '../helpers/books_helper.js'
import db from '@adonisjs/lucid/services/db'
import { UserAbilities } from '../enum/user_enum.js'
import Log from '#models/log'

@ApiTags('Book')
@validationErrorApiResponse()
@tooManyRequestsApiResponse()
export default class BooksController {
  @ApiOperation({
    summary: 'Create a new Book',
    description:
      'Creates a new book and (optionally) its relations (authors, narrators, genres, identifiers, series, tracks).',
    operationId: 'createBook',
  })
  @forbiddenApiResponse()
  @ApiBody({ type: () => createUpdateBookValidation })
  @successApiResponse({ type: BookDto, status: 201 })
  async create(context: HttpContext) {
    let payload = await context.request.validateUsing(createUpdateBookValidation)

    const abilities = new UserAbilities(undefined, context.auth.user)

    let log: Log | null = null
    if (payload.logId) {
      if (abilities.hasAbility('item:add')) throw Error()
      log = await Log.query().where('public_id', payload.logId).where('action', 1).firstOrFail()
      payload = await createUpdateBookValidation.validate(log.data)
    }

    if (!payload.title) {
      throw new Error('Title is required')
    }
    payload.title = payload.title || ''

    //if (abilities.hasAbility('item:draft:add')) throw Error()

    const exactDuplicates = await Book.query()
      .where((builder) => {
        // TODO: fix this
        // @ts-ignore
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
      return context.response.status(403).send({
        message: 'A book with the same title, subtitle and language already exists.',
      })
    }

    if (payload.identifiers && payload.identifiers.length > 0) {
      // @ts-ignore
      const existingBooks = (await ModelHelper.findByIdentifiers(Book, payload.identifiers)) as
        | Book[]
        | null

      if (existingBooks && existingBooks.length > 0) {
        return context.response.status(403).send({
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

    const trx = await db.transaction()

    const book = new Book()

    book.useTransaction(trx)

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

    await book.save()

    await BooksHelper.addGenreToBook(book, payload.genres)
    await ModelHelper.addIdentifier(book, payload.identifiers, trx)
    await BooksHelper.addContributorToBook(book, payload.contributors)
    await BooksHelper.addTrackToBook(book, payload.tracks)
    await BooksHelper.addSeriesToBook(book, payload.series)
    await BooksHelper.addPublisherToBook(book, payload.publisher)

    !log
      ? await book.saveWithLog(
          abilities.hasAbility('item:add')
            ? LogState.APPROVED
            : result.hits.length > 0
              ? LogState.DUPLICATE_FOUND
              : LogState.PENDING,
          payload
        )
      : await book.save()

    if (!abilities.hasAbility('item:add')) {
      console.log('User does not have permission to add books')
      await trx.rollback()
    } else {
      console.log(abilities.getAbilities())
      console.log('User has permission to add books')
      if (log) {
        log.state = LogState.APPROVED
      }
      await trx.commit()
    }

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
