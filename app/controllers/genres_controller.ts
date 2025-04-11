// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import Genre from '#models/genre'
import Book from '#models/book'

export default class GenresController {
  /**
   * @get
   * @operationId getGenre
   * @summary Get an genre by ID
   *
   * @requestBody - <getIdValidator>
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Genre>.with(relations).exclude(books)
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async get({ params }: HttpContext) {
    const payload = await getIdValidator.validate(params)
    return await Genre.query().where('publicId', payload.id).firstOrFail()
  }

  /**
   * @books
   * @operationId getBooksByGenre
   * @summary Get books by genre ID
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
      .preload('genres')
      .preload('narrators')
      .preload('series')
      .preload('identifiers')
      .preload('genres')
      .preload('tracks')
      .whereHas('genres', (q) => {
        q.where('public_id', payload.id)
      })
      .paginate(payload.page, payload.limit)
  }
}
