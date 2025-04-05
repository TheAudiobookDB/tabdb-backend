import Book from '#models/book'
import { Request } from '@adonisjs/http-server'
import { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

export class BooksHelper {
  /**
   *
   * @param request - The request object containing the search parameters.
   * @param limit - The maximum number of results to return.
   * @param showDisabled - Whether to include disabled books in the results.
   */
  static async findBooks(
    request: Request,
    limit?: number,
    showDisabled?: boolean
  ): Promise<ModelPaginatorContract<Book>> {
    const { title } = request.all()

    // Start building the query
    const query = Book.query()
      .preload('authors')
      .preload('narrators')
      .preload('genres')
      .preload('identifiers')
      .preload('series')
      .preload('tracks')
      .preload('group')
      .where('title', 'like', `%${title}%`)

    if (!showDisabled) {
      query.where('enabled', true)
    }

    return await query.paginate(request.input('page', 1), limit ?? 10)
  }
}
