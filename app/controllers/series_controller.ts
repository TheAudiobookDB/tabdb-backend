// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import Series from '#models/series'
import Book from '#models/book'
import { SeriesFullDto } from '#dtos/series'
import { BookDto } from '#dtos/book'
import { getIdsValidator } from '#validators/common_validator'

export default class SeriesController {
  /**
   * @get
   * @operationId getSeries
   * @summary Get a series by ID
   *
   * @requestBody - <getIdValidator>
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Series>.with(relations).exclude(books)
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async get({ params }: HttpContext) {
    const payload = await getIdValidator.validate(params)
    return new SeriesFullDto(
      await Series.query().where('publicId', payload.id).preload('identifiers').firstOrFail()
    )
  }

  /**
   * @books
   * @operationId getBooksBySeries
   * @summary Get books by series ID
   *
   * @paramUse(pagination)
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Book[]>.with(relations).paginated()
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
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

  async getMultiple({ request }: HttpContext) {
    const payload = await getIdsValidator.validate(request.qs())

    const series: Series[] = await Series.query()
      .whereIn('public_id', payload.ids)
      .preload('identifiers')

    if (!series || series.length === 0) throw new Error('No data found')

    return SeriesFullDto.fromArray(series)
  }
}
