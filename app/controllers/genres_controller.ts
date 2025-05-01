// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import Genre from '#models/genre'
import Book from '#models/book'
import { GenreFullDto } from '#dtos/genre'
import { BookDto } from '#dtos/book'
import { getIdsValidator } from '#validators/common_validator'

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
    return new GenreFullDto(await Genre.query().where('publicId', payload.id).firstOrFail())
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

  async getMultiple({ request }: HttpContext) {
    const payload = await getIdsValidator.validate(request.qs())

    const genres: Genre[] = await Genre.query().whereIn('public_id', payload.ids)

    if (!genres || genres.length === 0) throw new Error('No data found')

    return GenreFullDto.fromArray(genres)
  }
}
