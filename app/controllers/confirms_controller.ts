// import type { HttpContext } from '@adonisjs/core/http'

import Book from '#models/book'
import { HttpContext } from '@adonisjs/core/http'

export default class ConfirmsController {
  /**
   * @create
   * @operationId createDisabledBook
   * @summary Enables a disabled book
   * @description If a book was created that already exists or is very similar to an existing book, it will be disabled. This endpoint allows you to enable the book again. This only works with the link you received when creating the book.
   *
   * @paramQuery signature - The signature of the request
   * @paramQuery model - The model type (book) - enum(book)
   * @paramQuery id - The id of the book
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Book[]>.with(relations).paginated()
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async create({ request }: HttpContext) {
    const { model, id } = request.qs()

    if (request.hasValidSignature()) {
      return { message: 'Invalid signature' }
    }

    if (model === 'book') {
      const book = await Book.query().where('publicId', id).firstOrFail()
      if (book.enabled) {
        return { message: 'Book already enabled' }
      }
      await Book.enableBookAndRelations(book.id)

      return { message: 'Book created successfully', book }
    }

    return { message: 'Invalid model type' }
  }
}
