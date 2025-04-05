import type { HttpContext } from '@adonisjs/core/http'
import { searchBookValidator } from '#validators/search_validator'
import Book from '#models/book'

export default class SearchesController {
  /**
   * @book
   * @operationId searchBook
   * @summary Search for a book
   * @description Search for a book by multiple criteria and return a paginated list of books.
   *
   * TODO: Add request
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Book[]>.with(relations).paginated()
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async book({ request }: HttpContext) {
    await searchBookValidator.validate(request.all())

    const books = await Book.query()
      .where('title', 'like', `%${request.input('title')}%`)
      .preload('authors')
      .preload('narrators')
      .preload('genres')
      .preload('identifiers')
      .preload('series')
      .preload('tracks')
      .preload('group')
      .paginate(request.input('page', 1), 10)

    return books.serialize({})
  }
}
