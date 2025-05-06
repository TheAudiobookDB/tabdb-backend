// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import Genre from '#models/genre'
import Book from '#models/book'
import { GenreBaseDto, GenreFullDto } from '#dtos/genre'
import { BookDto } from '#dtos/book'
import { getIdsValidator } from '#validators/common_validator'
import { ApiOperation, ApiResponse, ApiTags } from '@foadonis/openapi/decorators'
import {
  limitApiProperty,
  limitApiQuery,
  nanoIdApiPathParameter,
  nanoIdsApiQuery,
  notFoundApiResponse,
  pageApiQuery,
  remainingApiProperty,
  requestIdApiProperty,
  tooManyRequestsApiResponse,
  validationErrorApiResponse,
} from '#config/openapi'
import { BookDtoPaginated } from '#dtos/pagination'
import NotFoundException from '#exceptions/not_found_exception'

@ApiTags('Genre')
@requestIdApiProperty()
@limitApiProperty()
@remainingApiProperty()
@validationErrorApiResponse()
@tooManyRequestsApiResponse()
export default class GenresController {
  @ApiOperation({
    summary: 'Get an genre by ID',
    operationId: 'getGenre',
  })
  @nanoIdApiPathParameter()
  @notFoundApiResponse()
  @ApiResponse({ type: GenreFullDto, status: 200 })
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
  @ApiResponse({ type: [BookDtoPaginated], status: 200 })
  async books({ params }: HttpContext) {
    const payload = await getIdPaginationValidator.validate(params)
    return BookDto.fromPaginator(
      await Book.query()
        .preload('genres')
        .preload('contributors', (q) => q.pivotColumns(['role', 'type']))
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
    summary: 'Get multiple Books by IDs',
    description:
      'Gets multiple genres by IDs. This only returns minified versions. If you want the full version, use the `get` endpoint.',
    operationId: 'getBooks',
  })
  @nanoIdsApiQuery()
  @notFoundApiResponse()
  @ApiResponse({ type: [GenreBaseDto], status: 200 })
  async getMultiple({ request }: HttpContext) {
    const payload = await getIdsValidator.validate(request.qs())

    const genres: Genre[] = await Genre.query().whereIn('public_id', payload.ids)

    if (!genres || genres.length === 0) throw new NotFoundException()

    return GenreBaseDto.fromArray(genres)
  }
}
