// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { createBookValidator, getBookValidator } from '#validators/book_validator'
import Book from '#models/book'

export default class BooksController {
  async create({ request }: HttpContext) {
    await createBookValidator.validate(request.all())

    const book = new Book()
    book.title = request.input('title')

    await book.save()

    return book
  }

  async get({ params }: HttpContext) {
    await getBookValidator.validate(params)

    return Book.query()
      .where('id', params.id)
      .preload('authors')
      .preload('narrators')
      .preload('genres')
      .preload('identifiers')
      .preload('series')
      .preload('tracks')

      .first()
  }
}
