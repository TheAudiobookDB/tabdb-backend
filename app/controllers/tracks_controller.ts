// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import Track from '#models/track'
import { TrackBaseDto, TrackFullDto } from '#dtos/track'
import Book from '#models/book'

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
    return new TrackFullDto(await Track.query().where('publicId', payload.id).firstOrFail())
  }

  /**
   * @getTracksForBook
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

    const book = await Book.findByOrFail('publicId', payload.id)

    return TrackBaseDto.fromPaginator(
      await Track.query()
        .where('bookId', book?.id)
        .preload('contributors', (q) => q.withScopes((s) => s.minimal()).pivotColumns(['role']))
        .preload('images')
        .orderBy('start')
        .paginate(payload.page, 500)
    )
  }
}
