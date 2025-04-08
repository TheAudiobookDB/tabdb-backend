import axios from 'axios'
import Book from '#models/book'
import {
  audiMetaAuthorValidator,
  audiMetaBookValidator,
  audiMetaSeriesValidator,
  audiMetaTrackValidator,
} from '#validators/provider_validator'
import { DateTime } from 'luxon'
import BooksController from '#controllers/books_controller'
import Author from '#models/author'
import { ModelHelper } from '../helpers/model_helper.js'
import Track from '#models/track'
import Series from '#models/series'

export class Audible {
  static async fetchBook(identifier: string, language: string): Promise<Book> {
    const result = await axios.get(`https://audimeta.de/book/${identifier}?region=${language}`)
    const response = result.data

    const payload = await audiMetaBookValidator.validate(response)

    let book: Book
    const foundBooks = await ModelHelper.findByIdentifier(Book, payload.asin, 'audible:asin')
    if (foundBooks && foundBooks.length > 0) {
      book = foundBooks[0] as Book
      console.log('Found a book with the same ASIN, updating it')
    } else {
      book = new Book()
    }

    book.title = payload.title
    book.subtitle = payload.subtitle ?? null
    book.description = payload.summary ?? null
    book.summary = payload.description ?? null
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
          identifiers: author.asin
            ? [
                {
                  type: 'audible:asin',
                  value: author.asin,
                },
              ]
            : undefined,
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
    await ModelHelper.addIdentifier(fullBook, [
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

  static async fetchAuthor(identifier: string, language: string): Promise<Author> {
    const result = await axios.get(`https://audimeta.de/author/${identifier}?region=${language}`)
    const response = result.data

    const payload = await audiMetaAuthorValidator.validate(response)

    let author: Author
    const foundAuthors = await ModelHelper.findByIdentifier(Author, payload.asin, 'audible:asin')
    if (foundAuthors && foundAuthors.length > 0) {
      author = foundAuthors[0] as Author
      console.log('Found an author with the same ASIN, updating it')
    } else {
      author = new Author()
    }

    author.name = payload.name
    author.description = payload.description ?? null

    await author.save()

    await ModelHelper.addIdentifier(author, [
      {
        type: 'audible:asin',
        value: payload.asin,
      },
    ])

    return author
  }

  static async fetchTracks(identifier: string, language: string) {
    console.log(`https://audimeta.de/chapters/${identifier}?region=${language}`)
    const result = await axios.get(`https://audimeta.de/chapters/${identifier}?region=${language}`)

    const response = result.data

    const payload = await audiMetaTrackValidator.validate(response)
    const books: Book[] | null = (await ModelHelper.findByIdentifier(
      Book,
      identifier,
      'audible:asin'
    )) as Book[] | null

    if (!books || books.length === 0) {
      throw new Error('Cannot add tracks to a book that does not exist')
    }

    const book: Book = books[0]

    const tracks: Track[] = []
    for (const chapter of payload.chapters) {
      const track = new Track()
      track.name = chapter.title
      track.start = chapter.startOffsetMs
      track.end = chapter.startOffsetMs + chapter.lengthMs
      track.bookId = book.id
      tracks.push(track)
    }
    // await a Promis of track.save() for each track
    await Promise.all(
      tracks.map(async (track) => {
        await track.save()
      })
    )
  }

  static async fetchSeries(identifier: string, language: string): Promise<Series> {
    const result = await axios.get(`https://audimeta.de/series/${identifier}?region=${language}`)
    const response = result.data

    const payload = await audiMetaSeriesValidator.validate(response)

    let series: Series
    const foundSeries = (await ModelHelper.findByIdentifier(
      Series,
      payload.asin,
      'audible:asin'
    )) as Series[] | null
    if (foundSeries && foundSeries.length > 0) {
      series = foundSeries[0] as Series
      console.log('Found a series with the same ASIN, updating it')
    } else {
      series = new Series()
    }

    series.name = payload.title
    series.description = payload.description ?? null

    await ModelHelper.addIdentifier(series, [
      {
        type: 'audible:asin',
        value: payload.asin,
      },
    ])

    await series.save()

    return series
  }
}
