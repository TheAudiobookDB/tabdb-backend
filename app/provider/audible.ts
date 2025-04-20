import axios from 'axios'
import Book from '#models/book'
import {
  audiMetaAuthorValidator,
  audiMetaBookValidator,
  audiMetaSeriesValidator,
  audiMetaTrackValidator,
  contributorValidator,
  publisherValidator,
  seriesValidator,
} from '#validators/provider_validator'
import { DateTime } from 'luxon'
import BooksController from '#controllers/books_controller'
import { ModelHelper } from '../helpers/model_helper.js'
import Track from '#models/track'
import Series from '#models/series'
import { Infer } from '@vinejs/vine/types'
import { ContributorType } from '../enum/contributor_enum.js'
import Contributor from '#models/contributor'
import logger from '@adonisjs/core/services/logger'
import { LogState } from '../enum/log_enum.js'
import { FileHelper } from '../helpers/file_helper.js'
import { nanoid } from '#config/app'
import { HttpContext } from '@adonisjs/core/http'
import {
  ProviderErrorException,
  ProviderNotFoundException,
} from '#exceptions/provider_error_exception'

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

    book.publicId = nanoid()
    book.title = payload.title
    book.subtitle = book.subtitle ?? payload.subtitle ?? null
    book.description = book.description ?? payload.summary ?? null
    book.summary = book.summary ?? payload.description ?? null
    book.language = book.language ?? payload.language ?? null
    book.copyright = book.copyright ?? payload.copyright ?? null

    const audibleCopyright = 'Certain parts of this item are copyrighted by Audible, Inc.'
    if (!book.copyright || !book.copyright?.includes('audibleCopyright')) {
      if (!book.copyright) book.copyright = audibleCopyright
      else book.copyright += `, ${audibleCopyright}`
    }
    book.duration =
      book.duration ?? (payload.lengthMinutes !== undefined ? payload.lengthMinutes * 60 : null)
    book.releasedAt =
      book.releasedAt ?? (payload.releaseDate ? DateTime.fromISO(payload.releaseDate) : null)
    book.isAbridged = book.isAbridged ?? payload.bookFormat === 'abridged'
    book.isExplicit = book.isExplicit ?? payload.explicit ?? false
    book.type = 'audiobook'

    if (payload.imageUrl && payload.imageUrl !== '' && !book.image) {
      const filePath = await FileHelper.saveFile(payload.imageUrl, 'covers', book.publicId)
      if (filePath) {
        book.image = filePath
      }
    }

    const fullBook: Book = await book.saveWithLog(LogState.APPROVED)

    const contributors: Infer<typeof contributorValidator>[] = []

    if (payload.authors) {
      for (const author of payload.authors) {
        contributors.push({
          name: author.name,
          identifiers: author.asin
            ? [
                {
                  type: 'audible:asin',
                  value: author.asin,
                },
              ]
            : undefined,
          type: ContributorType.AUTHOR,
        })
      }
    }
    if (payload.narrators) {
      for (const narrator of payload.narrators) {
        contributors.push({
          name: narrator.name,
          type: ContributorType.NARRATOR,
        })
      }
    }

    await BooksController.addContributorToBook(book, contributors)

    if (payload.series) {
      const series: Infer<typeof seriesValidator>[] = []
      for (const serie of payload.series) {
        series.push({
          name: serie.name,
          position: serie.position,
          language: book.language ?? undefined,
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

    await BooksController.addGenreToBook(fullBook, payload.genres)
    await ModelHelper.addIdentifier(fullBook, [
      {
        type: 'audible:asin',
        value: payload.asin,
      },
      // If isbn is not null, add it as an identifier
      // @ts-ignore
      ...(payload.isbn
        ? [
            {
              type: 'isbn13',
              value: payload.isbn,
            },
          ]
        : []),
    ])

    if (payload.publisher) {
      const publisher: Infer<typeof publisherValidator> = {
        name: payload.publisher,
      }
      await BooksController.addPublisherToBook(book, publisher)
    }

    await Book.enableBookAndRelations(fullBook.id)

    return fullBook
  }

  static async fetchAuthor(identifier: string, language: string): Promise<Contributor | undefined> {
    try {
      const result = await axios.get(`https://audimeta.de/author/${identifier}?region=${language}`)
      const response = result.data

      const payload = await audiMetaAuthorValidator.validate(response)

      let author: Contributor
      const foundAuthors = await ModelHelper.findByIdentifier(
        Contributor,
        payload.asin,
        'audible:asin'
      )
      if (foundAuthors && foundAuthors.length > 0) {
        author = foundAuthors[0] as Contributor
        console.log('Found an author with the same ASIN, updating it')
      } else {
        author = new Contributor()
      }

      author.name = payload.name
      author.description = payload.description ?? null
      author.enabled = true

      await author.saveWithLog(LogState.APPROVED)

      await ModelHelper.addIdentifier(author, [
        {
          type: 'audible:asin',
          value: payload.asin,
        },
      ])

      return author
    } catch (err) {
      const ctx = HttpContext.get()

      if (axios.isAxiosError(err) && err.response?.status === 404) {
        throw new ProviderNotFoundException()
      }
      if (!ctx) {
        logger.error(err)
      }
      throw new ProviderErrorException(err.message)
    }
  }

  static async fetchTracks(identifier: string, language: string) {
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

    const tracksData = payload.chapters.map((chapter) => {
      return {
        name: chapter.title,
        start: chapter.startOffsetMs,
        end: chapter.startOffsetMs + chapter.lengthMs,
        bookId: book.id,
      }
    })

    if (tracksData.length > 0) {
      await Track.updateOrCreateMany(['bookId', 'name'], tracksData)
    }

    return book
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
    series.enabled = true

    await ModelHelper.addIdentifier(series, [
      {
        type: 'audible:asin',
        value: payload.asin,
      },
    ])

    await series.saveWithLog()

    return series
  }
}
