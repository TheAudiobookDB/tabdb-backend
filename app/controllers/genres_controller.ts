// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import Genre from '#models/genre'
import Book from '#models/book'
import { GenreBaseDto, GenreFullDto, GenreMinimalDto } from '#dtos/genre'
import { BookDto } from '#dtos/book'
import { getIdsValidator } from '#validators/common_validator'
import { ApiBody, ApiOperation, ApiTags } from '@foadonis/openapi/decorators'
import {
  createdApiResponse,
  duplicateApiResponse,
  forbiddenApiResponse,
  jsonHeaderApi,
  limitApiQuery,
  nanoIdApiPathParameter,
  nanoIdsApiQuery,
  notFoundApiResponse,
  pageApiQuery,
  successApiResponse,
  tooManyRequestsApiResponse,
  validationErrorApiResponse,
} from '#config/openapi'
import { BookDtoPaginated } from '#dtos/pagination'
import NotFoundException from '#exceptions/not_found_exception'
import { createGenreValidation } from '#validators/crud_validator'
import db from '@adonisjs/lucid/services/db'
import { genreIndex } from '#config/meilisearch'
import { nanoid } from '#config/app'
import { LogState } from '../enum/log_enum.js'
import router from '@adonisjs/core/services/router'

@ApiTags('Genre')
@validationErrorApiResponse()
@tooManyRequestsApiResponse()
@jsonHeaderApi()
export default class GenresController {
  @ApiOperation({
    summary: 'Get an genre by ID',
    operationId: 'getGenre',
  })
  @nanoIdApiPathParameter()
  @notFoundApiResponse()
  @successApiResponse({ type: GenreFullDto, status: 200 })
  async get({ params }: HttpContext) {
    const payload = await getIdValidator.validate(params)
    return new GenreFullDto(await Genre.query().where('publicId', payload.id).firstOrFail())
  }

  @ApiOperation({
    summary: 'Get books by genre ID',
    operationId: 'getBooksByGenre',
    tags: ['Book'],
  })
  @pageApiQuery()
  @limitApiQuery()
  @nanoIdApiPathParameter()
  @notFoundApiResponse()
  @successApiResponse({ type: BookDtoPaginated, status: 200 })
  async books({ params }: HttpContext) {
    const payload = await getIdPaginationValidator.validate(params)
    return BookDto.fromPaginator(
      await Book.query()
        .preload('genres')
        .preload('genres', (q) => q.pivotColumns(['role', 'type']))
        .preload('series')
        .preload('identifiers')
        .preload('genres')
        .preload('tracks')
        .preload('publisher')
        .whereHas('genres', (q) => {
          q.where('public_id', payload.id)
        })
        .paginate(payload.page, payload.limit)
    )
  }

  @ApiOperation({
    summary: 'Get multiple Genres by IDs',
    description:
      'Gets multiple genres by IDs. This only returns minified versions. If you want the full version, use the `get` endpoint.',
    operationId: 'getGenres',
  })
  @nanoIdsApiQuery()
  @notFoundApiResponse()
  @successApiResponse({ type: [GenreBaseDto], status: 200 })
  async getMultiple({ request }: HttpContext) {
    const payload = await getIdsValidator.validate(request.qs())

    const genres: Genre[] = await Genre.query().whereIn('public_id', payload.ids)

    if (!genres || genres.length === 0) throw new NotFoundException()

    return GenreBaseDto.fromArray(genres)
  }

  @ApiOperation({
    summary: 'Create a new Genre',
    description: 'Creates a new genre.',
    operationId: 'createGenre',
  })
  @forbiddenApiResponse()
  @ApiBody({ type: () => createGenreValidation })
  @duplicateApiResponse('GenreBaseDto')
  @createdApiResponse('GenreFullDto', 'GenreMinimalDto')
  async create({ request, response }: HttpContext) {
    const payload = await createGenreValidation.validate(request.body())

    const trx = await db.transaction()

    try {
      const existingGenre = await genreIndex.search(payload.name, {
        limit: 3,
        attributesToRetrieve: ['id'],
        rankingScoreThreshold: 0.95,
      })
      const ids = existingGenre.hits.map((genre) => genre.id)
      const potentialGenres = await Genre.query()
        .whereILike('name', payload.name!)
        .orWhereIn('id', ids)

      const duplicateGenre = potentialGenres.find((genre) => {
        return (
          genre.name.toLowerCase() === payload.name!.toLowerCase() && genre.type === payload.type
        )
      })

      if (duplicateGenre) {
        return response.status(409).send({
          message: 'Genre already exists',
          requestId: request.id(),
          data: new GenreBaseDto(duplicateGenre),
        })
      }

      let possibleDuplicate = false
      if (existingGenre.hits.length > 0) {
        possibleDuplicate = true
      }
      if (potentialGenres && potentialGenres.length) {
        possibleDuplicate = true
      }

      const genre = new Genre()
      genre.publicId = nanoid()
      genre.name = payload.name
      genre.type = payload.type
      genre.enabled = !possibleDuplicate

      genre.useTransaction(trx)
      await genre.saveWithLog(
        possibleDuplicate ? LogState.PENDING_DUPLICATE : LogState.PENDING,
        payload
      )

      await trx.commit()

      return {
        message: possibleDuplicate
          ? 'Genre created with pending duplicate. Please'
          : 'Genre created',
        data: new GenreFullDto(genre),
        ...(possibleDuplicate
          ? {
              activationLink: router
                .builder()
                .qs({ id: genre.publicId })
                .disableRouteLookup()
                .makeSigned(`/confirm/genre`, {
                  expiresIn: '7d',
                  purpose: 'confirm-genre',
                }),
              duplicates: GenreMinimalDto.fromArray(potentialGenres),
            }
          : {}),
      }
    } catch (e) {
      await trx.rollback()

      throw e
    }
  }
}
