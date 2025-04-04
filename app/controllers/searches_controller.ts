import type { HttpContext } from '@adonisjs/core/http'
import { searchBookValidator } from '#validators/search_validator'
import Book from '#models/book'

export default class SearchesController {
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
