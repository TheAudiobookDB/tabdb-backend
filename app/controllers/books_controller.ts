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
import { createUpdateBookValidation, mergeItemsValidation } from '#validators/crud_validator'
import { BooksHelper } from '../helpers/books_helper.js'
import db from '@adonisjs/lucid/services/db'
import { UserAbilities } from '../enum/user_enum.js'
import Log from '#models/log'
import { FileHelper } from '../helpers/file_helper.js'
import { IdentifierValidator } from '#validators/custom_validator'
import ForbiddenException from '#exceptions/forbidden_exception'
import { CascadingSoftDeleteHelper } from '../helpers/cascading_soft_delete_helper.js'

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
  @successApiResponse({
    status: 201,
    description:
      'Indicates the item was created successfully, or with a pending status if potential duplicates were found.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description:
            'A summary of the outcome. Returns a success message on standard creation, or explains that the item was created in a pending state due to possible duplicates. If pending, an activation link is provided. The activation link remains valid for 7 days; after this period, the pending item will be deleted.',
          example: 'Contributor created successfully',
        },
        data: { $ref: `#/components/schemas/BookDto` },
        activationLink: {
          type: 'string',
          description:
            'A URL to activate the newly created item, valid for 7 days. After this period, the item will be deleted if not activated. Items created in a pending state require activation searchable and usable. Items need to be approved afterwards by an moderator and can be deleted at any point. For books, moderator approval is mandatory before search is enabled.',
        },
        available: {
          type: 'boolean',
          description:
            'Indicates whether the user has permission to add books. If false, the book is created in a pending state and requires moderator approval.',
        },
      },
      required: ['message', 'data'],
    },
  })
  async create(context: HttpContext) {
    let payload = await context.request.validateUsing(createUpdateBookValidation)
    payload.identifiers = IdentifierValidator.validateMany(payload.identifiers)

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

    await book.save()

    await trx.commit()

    if (payload.image) {
      book.image =
        (await FileHelper.uploadFromTemp(payload.image, 'covers', book.publicId, true)) ||
        book.image
    }

    if (payload.images) {
      for (const image of payload.images) {
        const uploadedImage = await FileHelper.uploadFromTemp(image, 'covers', book.publicId, true)
        if (uploadedImage) {
          const imageModel: Image = new Image()
          imageModel.bookId = book.id
          imageModel.image = uploadedImage
          await book.related('images').save(imageModel)
        }
      }
    }

    await BooksHelper.addGenreToBook(book, payload.genres)
    await ModelHelper.addIdentifier(book, payload.identifiers)
    await BooksHelper.addContributorToBook(book, payload.contributors)
    await BooksHelper.addTracksToBook(book, payload.tracks)
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
      book.enabled = true
      await book.save()
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
        data: bookDto,
        activationLink: url,
        available: false,
      }
    }

    return {
      data: bookDto,
      message: 'Book created successfully.',
      available: abilities.hasAbility('item:add'),
    }
  }

  @ApiOperation({
    summary: 'Merge two Books by ID',
    description:
      'Merges two books into one, combining their data and relations. The first book will be the primary book which the second book will be merged into. The id will then be the id of the first book.',
    operationId: 'mergeBooks',
  })
  @notFoundApiResponse()
  @forbiddenApiResponse()
  @ApiBody({ type: () => mergeItemsValidation })
  @successApiResponse({ type: BookDto, status: 201 })
  async merge({ request, auth }: HttpContext) {
    const payload = await request.validateUsing(mergeItemsValidation)

    const abilities = new UserAbilities(undefined, auth.user)

    if (!abilities.hasAbility('item:merge')) {
      //throw new ForbiddenException('You do not have permission to merge books.')
    }

    const book1: Book = await Book.query()
      .where('public_id', payload.item1.id)
      .withScopes((s) => s.fullAll())
      .firstOrFail()

    const book2: Book = await Book.query()
      .where('public_id', payload.item2.id)
      .withScopes((s) => s.fullAll())
      .firstOrFail()

    if (book1.id === book2.id) {
      throw new NotFoundException('Cannot merge a book with itself.')
    }

    const mergedBook = await BooksHelper.mergeBooks(book1, book2, payload)

    return new BookDto(mergedBook)
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

  @ApiOperation({
    summary: 'Delete a Book by ID',
    description:
      'Soft deletes a book by setting its deletedAt timestamp. This will also remove it from search indices.',
    operationId: 'deleteBook',
  })
  @nanoIdApiPathParameter()
  @forbiddenApiResponse()
  @notFoundApiResponse()
  @successApiResponse({ status: 204 })
  async delete({ params, auth }: HttpContext) {
    await getBookValidator.validate(params)

    const abilities = new UserAbilities(undefined, auth.user)

    if (!abilities.hasAbility('item:delete')) {
      throw new ForbiddenException('You do not have permission to delete books.')
    }

    const book: Book = await Book.query()
      .where('public_id', params.id)
      .whereNull('deleted_at')
      .firstOrFail()

    await CascadingSoftDeleteHelper.deleteBook(book)

    void bookIndex.deleteDocument(book.id)

    return { message: 'Book and related entities deleted successfully' }
  }
}
