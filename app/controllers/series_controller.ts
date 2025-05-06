// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import Series from '#models/series'
import Book from '#models/book'
import { SeriesBaseDto, SeriesFullDto } from '#dtos/series'
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

@ApiTags('Series')
@requestIdApiProperty()
@limitApiProperty()
@remainingApiProperty()
@validationErrorApiResponse()
@tooManyRequestsApiResponse()
export default class SeriesController {
  @ApiOperation({
    summary: 'Get a Series by ID',
    operationId: 'getSeries',
  })
  @nanoIdApiPathParameter()
  @notFoundApiResponse()
  @ApiResponse({ type: SeriesFullDto, status: 200 })
  async get({ params }: HttpContext) {
    const payload = await getIdValidator.validate(params)
    return new SeriesFullDto(
      await Series.query().where('publicId', payload.id).preload('identifiers').firstOrFail()
    )
  }

  @ApiOperation({
    summary: 'Get books by series ID',
    operationId: 'getBooksBySeries',
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
        .whereHas('series', (q) => {
          q.where('public_id', payload.id)
        })
        .paginate(payload.page, payload.limit)
    )
  }

  @ApiOperation({
    summary: 'Get multiple Series by IDs',
    description:
      'Gets multiple series by IDs. This only returns minified versions. If you want the full version, use the `get` endpoint.',
    operationId: 'getMultipleSeries',
  })
  @nanoIdsApiQuery()
  @notFoundApiResponse()
  @ApiResponse({ type: [SeriesBaseDto], status: 200 })
  async getMultiple({ request }: HttpContext) {
    const payload = await getIdsValidator.validate(request.qs())

    const series: Series[] = await Series.query()
      .whereIn('public_id', payload.ids)
      .preload('identifiers')

    if (!series || series.length === 0) throw new NotFoundException()

    return SeriesBaseDto.fromArray(series)
  }
}
