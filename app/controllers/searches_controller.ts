import type { HttpContext } from '@adonisjs/core/http'
import { searchBookValidator } from '#validators/search_validator'
import Book from '#models/book'
import { bookIndex } from '#config/meilisearch'

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
    const payload = await searchBookValidator.validate(request.all())

    const books = await bookIndex.search(payload.title)
    if (!books || !books.hits || books.hits.length <= 0) {
      return {
        message: 'Books not found',
      }
    }

    const bookIds = books.hits.map((book) => book.id)

    const bookResults = await Book.query()
      .whereIn('id', bookIds)
      .preload('authors')
      .preload('narrators')
      .preload('genres')
      .preload('identifiers')
      .preload('series')
      .preload('tracks')
      .preload('group')
      .paginate(request.input('page', 1), 10)

    return bookResults.serialize({})
  }
}
