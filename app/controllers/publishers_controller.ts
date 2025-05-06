// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import Publisher from '#models/publisher'
import Book from '#models/book'
import { PublisherBaseDto, PublisherFullDto } from '#dtos/publisher'
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

@ApiTags('Publisher')
@requestIdApiProperty()
@limitApiProperty()
@remainingApiProperty()
@validationErrorApiResponse()
@tooManyRequestsApiResponse()
export default class PublishersController {
  @ApiOperation({
    summary: 'Get a Publisher by ID',
    operationId: 'getPublisher',
  })
  @nanoIdApiPathParameter()
  @notFoundApiResponse()
  @ApiResponse({ type: PublisherFullDto, status: 200 })
  async get({ params }: HttpContext) {
    const payload = await getIdValidator.validate(params)
    return new PublisherFullDto(await Publisher.query().where('publicId', payload.id).firstOrFail())
  }

  @ApiOperation({
    summary: 'Get books for publisher ID',
    operationId: 'getBooksForPublisher',
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
        .preload('contributors', (q) => q.pivotColumns(['role', 'type']))
        .preload('series')
        .preload('identifiers')
        .preload('genres')
        .preload('tracks')
        .preload('publisher')
        .whereHas('publisher', (q) => {
          q.where('public_id', payload.id)
        })
        .paginate(payload.page, payload.limit)
    )
  }

  @ApiOperation({
    summary: 'Get multiple Publisher by IDs',
    description:
      'Gets multiple publishers by IDs. This only returns minified versions. If you want the full version, use the `get` endpoint.',
    operationId: 'getPublishers',
    tags: ['Publisher'],
  })
  @nanoIdsApiQuery()
  @notFoundApiResponse()
  @ApiResponse({ type: [PublisherBaseDto], status: 200 })
  async getMultiple({ request }: HttpContext) {
    const payload = await getIdsValidator.validate(request.qs())

    const publishers: Publisher[] = await Publisher.query().whereIn('public_id', payload.ids)

    if (!publishers || publishers.length === 0) throw new NotFoundException()

    return PublisherBaseDto.fromArray(publishers)
  }
}
