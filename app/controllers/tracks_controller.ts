// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import Track from '#models/track'

export default class TracksController {
  /**
   * @get
   * @operationId getTrack
   * @summary Get a track by ID
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Track>.exclude(book)
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async get({ params }: HttpContext) {
    const payload = await getIdValidator.validate(params)
    return await Track.query().where('publicId', payload.id).firstOrFail()
  }

  /**
   * @get
   * @operationId getTracksForBook
   * @summary Get tracks for a book by ID
   *
   * @paramUse(pagination)
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Track[]>.exclude(book).paginated()
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async getTracksForBook({ params }: HttpContext) {
    const payload = await getIdPaginationValidator.validate(params)
    return await Track.query()
      .where('bookId', payload.id)
      .preload('book')
      .paginate(payload.page, payload.limit)
  }
}
