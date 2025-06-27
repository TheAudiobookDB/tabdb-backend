// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import Series from '#models/series'
import Book from '#models/book'
import { SeriesBaseDto, SeriesFullDto, SeriesMinimalDto } from '#dtos/series'
import { BookDto } from '#dtos/book'
import { getIdsValidator } from '#validators/common_validator'
import { ApiBody, ApiOperation, ApiTags } from '@foadonis/openapi/decorators'
import {
  createdApiResponse,
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
import { BookDtoPaginated } from '#dtos/pagination'
import NotFoundException from '#exceptions/not_found_exception'
import db from '@adonisjs/lucid/services/db'
import { seriesIndex } from '#config/meilisearch'
import { nanoid } from '#config/app'
import { LogState } from '../enum/log_enum.js'
import { FileHelper } from '../helpers/file_helper.js'
import { ModelHelper } from '../helpers/model_helper.js'
import router from '@adonisjs/core/services/router'
import { createSeriesValidation } from '#validators/crud_validator'

@ApiTags('Series')
@validationErrorApiResponse()
@tooManyRequestsApiResponse()
export default class SeriesController {
  @ApiOperation({
    summary: 'Get a Series by ID',
    operationId: 'getSeries',
  })
  @nanoIdApiPathParameter()
  @notFoundApiResponse()
  @successApiResponse({ type: SeriesFullDto, status: 200 })
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
  @successApiResponse({ type: BookDtoPaginated, status: 200 })
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
  @successApiResponse({ type: [SeriesBaseDto], status: 200 })
  async getMultiple({ request }: HttpContext) {
    const payload = await getIdsValidator.validate(request.qs())

    const series: Series[] = await Series.query()
      .whereIn('public_id', payload.ids)
      .preload('identifiers')

    if (!series || series.length === 0) throw new NotFoundException()

    return SeriesBaseDto.fromArray(series)
  }

  @ApiOperation({
    summary: 'Create a new Series',
    description: 'Creates a new series. This will also upload the image if provided.',
    operationId: 'createSeries',
  })
  @forbiddenApiResponse()
  @ApiBody({ type: () => createSeriesValidation })
  @createdApiResponse('SeriesFullDto', 'SeriesMinimalDto')
  async create({ request }: HttpContext) {
    const payload = await createSeriesValidation.validate(request.body())

    const trx = await db.transaction()

    try {
      const existingSeries = await seriesIndex.search(payload.name, {
        limit: 3,
        attributesToRetrieve: ['id'],
        rankingScoreThreshold: 0.95,
      })
      const ids = existingSeries.hits.map((series) => series.id)
      const potentialSeriess = await Series.query()
        .whereILike('name', payload.name!)
        .orWhereIn('id', ids)

      let possibleDuplicate = false
      if (existingSeries.hits.length > 0) {
        possibleDuplicate = true
      }
      if (potentialSeriess && potentialSeriess.length) {
        possibleDuplicate = true
      }

      const series = new Series()
      series.publicId = nanoid()
      series.name = payload.name!
      series.description = payload.description || null
      series.enabled = !possibleDuplicate

      series.useTransaction(trx)
      await series.saveWithLog(
        possibleDuplicate ? LogState.PENDING_DUPLICATE : LogState.PENDING,
        payload
      )
      await trx.commit()

      if (payload.image) {
        series.image =
          (await FileHelper.uploadFromTemp(payload.image, 'series', series.publicId, true)) ||
          series.image
      }

      if (payload.identifiers) {
        await ModelHelper.addIdentifier(series, payload.identifiers, trx)
      }

      await trx.commit()

      return {
        message: possibleDuplicate
          ? 'Series created with pending duplicate. Please'
          : 'Series created',
        data: new SeriesFullDto(series),
        ...(possibleDuplicate
          ? {
              activationLink: router
                .builder()
                .qs({ id: series.publicId })
                .disableRouteLookup()
                .makeSigned(`/confirm/series`, {
                  expiresIn: '7d',
                  purpose: 'confirm-series',
                }),
              duplicates: SeriesMinimalDto.fromArray(potentialSeriess),
            }
          : {}),
      }
    } catch (e) {
      await trx.rollback()

      throw e
    }
  }
}
