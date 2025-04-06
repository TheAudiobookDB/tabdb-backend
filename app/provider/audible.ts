import axios from 'axios'
import Book from '#models/book'
import { audiMetaBookValidator } from '#validators/provider_validator'
import { DateTime } from 'luxon'
import BooksController from '#controllers/books_controller'

export class Audible {
  static async fetchBook(identifier: string, language: string): Promise<Book> {
    const result = await axios.get(`https://audimeta.de/book/${identifier}?region=${language}`)
    const response = result.data

    const payload = await audiMetaBookValidator.validate(response)

    const book: Book = new Book()

    book.title = payload.title
    book.subtitle = payload.subtitle ?? null
    book.description = payload.description ?? null
    book.summary = payload.summary ?? null
    book.publisher = payload.publisher ?? null
    book.language = payload.language ?? null
    book.copyright = payload.copyright ?? null
    book.duration = payload.lengthMinutes !== undefined ? payload.lengthMinutes * 60 : null
    book.releasedAt = payload.releaseDate ? DateTime.fromISO(payload.releaseDate) : null
    book.isAbridged = payload.bookFormat === 'abridged'
    book.isExplicit = payload.explicit ?? false
    book.type = 'audiobook'
    book.groupId = null

    const fullBook: Book = await book.save()

    if (payload.authors) {
      const authors: object[] = []
      for (const author of payload.authors) {
        authors.push({
          name: author.name,
          identifiers: [
            {
              type: 'audible:asin',
              value: author.asin,
            },
          ],
        })
      }

      await BooksController.addAuthorToBook(fullBook, authors)
    }

    if (payload.series) {
      const series: object[] = []
      for (const serie of payload.series) {
        series.push({
          name: serie.name,
          position: serie.position,
          identifiers: [
            {
              type: 'audible:asin',
              value: serie.asin,
            },
          ],
        })
      }

      await BooksController.addSeriesToBook(fullBook, series)
    }

    await BooksController.addNarratorToBook(fullBook, payload.narrators)
    await BooksController.addGenreToBook(fullBook, payload.genres)
    await BooksController.addIdentifierToBook(fullBook, [
      {
        type: 'audible:asin',
        value: payload.asin,
      },
      // If isbn is not null, add it as an identifier
      ...(payload.isbn
        ? [
            {
              type: 'isbn13',
              value: payload.isbn,
            },
          ]
        : []),
    ])

    fullBook.enabled = true
    await fullBook.save()

    return fullBook
  }
}
