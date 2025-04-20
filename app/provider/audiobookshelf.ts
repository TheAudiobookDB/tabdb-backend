import {
  audiobookshelfValidator,
  contributorValidator,
  genreValidator,
  identifierValidator,
  publisherValidator,
  seriesValidator,
} from '#validators/provider_validator'
import { ModelHelper } from '../helpers/model_helper.js'
import Book from '#models/book'
import { DateTime } from 'luxon'
import BooksController from '#controllers/books_controller'
import { Infer } from '@vinejs/vine/types'
import { ContributorType } from '../enum/contributor_enum.js'

export class Audiobookshelf {
  static async fetchBook(payloadObj: object): Promise<Book> {
    const payload = await audiobookshelfValidator.validate(payloadObj)

    let foundBooks: Book[] | null = null
    if (payload.asin) {
      foundBooks = (await ModelHelper.findByIdentifier(Book, payload.asin, 'audible:asin')) as
        | Book[]
        | null
    }
    if (payload.isbn && !foundBooks) {
      foundBooks = (await ModelHelper.findByIdentifier(Book, payload.isbn, 'isbn13')) as
        | Book[]
        | null
    }
    if (!foundBooks) {
      const book = (await ModelHelper.findDuplicateBook(Book, {
        title: payload.title,
        subtitle: payload.subtitle,
      })) as Book | null
      if (book) {
        foundBooks = [book]
      }
    }

    let book: Book | undefined
    if (foundBooks && foundBooks.length > 0) {
      book = foundBooks[0]
    }
    if (!book) book = new Book()

    book.title = payload.title
    book.subtitle = payload.subtitle ?? null
    book.description = payload.description ?? null
    book.releasedAt = payload.publishedYear
      ? DateTime.fromObject({ year: Number.parseInt(payload.publishedYear) })
      : null
    book.language = payload.language ?? null
    book.isExplicit = payload.explicit ?? false
    book.isAbridged = payload.abridged ?? null

    await book.saveWithLog()

    const genresTags: Infer<typeof genreValidator>[] = []
    for (const tag of payload.tags ?? []) {
      genresTags.push({ name: tag, type: 'tag' })
    }
    for (const genre of payload.genres ?? []) {
      genresTags.push({ name: genre, type: 'genre' })
    }
    await BooksController.addGenreToBook(book, genresTags)

    const contributors: Infer<typeof contributorValidator>[] = []
    for (const author of payload.authors ?? []) {
      contributors.push({ name: author, type: ContributorType.AUTHOR })
    }
    for (const narrator of payload.narrators ?? []) {
      contributors.push({ name: narrator, type: ContributorType.NARRATOR })
    }
    await BooksController.addContributorToBook(book, contributors)

    const series: Infer<typeof seriesValidator>[] = []
    for (const serie of payload.series ?? []) {
      const [name, position] = serie.split(/#(.+)/)

      series.push({
        name: name.trim(),
        position: position?.trim(),
      })
    }
    await BooksController.addSeriesToBook(book, series)

    const chapters = []
    for (const chapter of payload.chapters ?? []) {
      chapters.push({ name: chapter.title, start: chapter.start * 1000, end: chapter.end * 1000 })
    }

    await BooksController.addTrackToBook(book, chapters)

    if (payload.publisher) {
      const publisher: Infer<typeof publisherValidator> = {
        name: payload.publisher,
      }
      await BooksController.addPublisherToBook(book, publisher)
    }

    const identifiers: Infer<typeof identifierValidator>[] = []
    if (payload.asin) {
      identifiers.push({ type: 'audible:asin', value: payload.asin })
    }
    if (payload.isbn) {
      identifiers.push({ type: 'isbn13', value: payload.isbn })
    }
    await ModelHelper.addIdentifier(book, identifiers)

    return book
  }
}
