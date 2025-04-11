// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import Series from '#models/series'
import Book from '#models/book'

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
    return await Series.query().where('publicId', payload.id).preload('identifiers').firstOrFail()
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
    return Book.query()
      .preload('authors')
      .preload('authors')
      .preload('series')
      .preload('identifiers')
      .preload('genres')
      .preload('tracks')
      .whereHas('series', (q) => {
        q.where('public_id', payload.id)
      })
      .paginate(payload.page, payload.limit)
  }
}
