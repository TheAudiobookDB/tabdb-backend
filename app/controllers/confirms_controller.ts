// import type { HttpContext } from '@adonisjs/core/http'

import Book from '#models/book'
import { HttpContext } from '@adonisjs/core/http'

export default class ConfirmsController {
  /**
   * @summary Confirm the creation of a book
   * @tag Book
   * @description Confirm the creation of a book
   * @operationId confirmBook
   * @responseBody 200 - { message: string }
   */
  async create({ request }: HttpContext) {
    const { model, id } = request.qs()

    if (request.hasValidSignature()) {
      return { message: 'Invalid signature' }
    }

    if (model === 'book') {
      const book = await Book.query().where('id', id).firstOrFail()
      if (book.enabled) {
        return { message: 'Book already enabled' }
      }
      book.enabled = true
      await book.save()

      return { message: 'Book created successfully', book }
    }

    return { message: 'Invalid model type' }
  }
}
