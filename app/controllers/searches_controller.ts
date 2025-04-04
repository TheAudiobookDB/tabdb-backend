import type { HttpContext } from '@adonisjs/core/http'
import { searchBookValidator } from '#validators/search_validator'
import Book from '#models/book'

export default class SearchesController {
  /**
   * @summary Returns a list of books based on the search criteria
   * @tag Search
   * @description Returns a list of books based on the search criteria
   * @operationId searchBook
   * @responseBody 200 . <Book[]>
   * @responseHeader 200 - @use(paginated)
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
