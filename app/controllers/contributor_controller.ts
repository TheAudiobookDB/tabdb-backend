// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import Contributor from '#models/contributor'
import Book from '#models/book'

export default class NarratorsController {
  /**
   * @get
   * @operationId getContributor
   * @summary Get a contributor by ID
   *
   * @requestBody - <getIdValidator>
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Contributor>.with(relations).exclude(books)
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async get({ params }: HttpContext) {
    const payload = await getIdValidator.validate(params)
    return await Contributor.query()
      .where('publicId', payload.id)
      .preload('identifiers')
      .firstOrFail()
  }

  /**
   * @books
   * @operationId getBooksByNarrator
   * @summary Get books by narrator ID
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
      .preload('contributors', (q) => q.pivotColumns(['role', 'type']))
      .preload('series')
      .preload('identifiers')
      .preload('genres')
      .preload('tracks')
      .preload('publisher')
      .whereHas('contributors', (q) => {
        q.where('public_id', payload.id)
      })
      .paginate(payload.page, payload.limit)
  }
}
