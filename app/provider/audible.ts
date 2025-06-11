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
import { ProviderNotFoundException } from '#exceptions/provider_error_exception'
import { BooksHelper } from '../helpers/books_helper.js'
import Genre from '#models/genre'
import Publisher from '#models/publisher'
import { TrackType } from '../enum/track_enum.js'
import { IdentifierType } from '../enum/identifier_enum.js'

export class Audible {
  static async fetchBook(identifier: string, language: string): Promise<Book> {
    const result = await axios.get(`https://audimeta.de/book/${identifier}?region=${language}`)
    const response = result.data

    const payload = await audiMetaBookValidator.validate(response)

    let book: Book
    const foundBooks = await ModelHelper.findByIdentifier(
      Book,
      payload.asin,
      IdentifierType.AudibleAsin
    )
    if (foundBooks && foundBooks.length > 0) {
      book = foundBooks[0] as Book
      console.log('Found a book with the same ASIN, updating it')
    } else {
      book = new Book()
    }

    book.publicId = book.publicId ?? nanoid()
    book.title = payload.title
    book.subtitle = book.subtitle ?? payload.subtitle ?? null
    book.description = book.description ?? payload.summary ?? null
    book.summary = book.summary ?? payload.description ?? null
    book.language = book.language ?? payload.language ?? null
    book.copyright = book.copyright ?? payload.copyright ?? null

    const audibleCopyright = 'Certain parts of this item are copyrighted by Audible, Inc.'
    if (!book.copyright || !book.copyright?.includes(audibleCopyright)) {
      if (!book.copyright) book.copyright = audibleCopyright
      else book.copyright += `, ${audibleCopyright}`
    }
    book.copyright = book.copyright.substring(0, 255)
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
                  type: IdentifierType.AudibleAsin,
                  value: author.asin,
                  extra: language,
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

    const uniqueContributors = contributors.filter(
      (contributor, index, self) => index === self.findIndex((c) => c.name === contributor.name)
    )

    // @ts-ignore
    const createdContributors = await Contributor.fetchOrCreateMany(['name'], uniqueContributors, {
      allowExtraProperties: true,
    })

    await BooksHelper.addContributorToBook(
      fullBook,
      // @ts-ignore
      contributors
        .map((contributor) => {
          const foundContributor = createdContributors.find((c) => c.name === contributor.name)
          if (foundContributor) {
            return {
              id: foundContributor.publicId,
              type: contributor.type,
            }
          }
          return null
        })
        .filter((contributor) => contributor !== null)
    )

    if (payload.series) {
      const series: Infer<typeof seriesValidator>[] = []
      for (const serie of payload.series) {
        series.push({
          name: serie.name,
          position: serie.position,
          language: book.language ?? undefined,
          identifiers: [
            {
              type: IdentifierType.AudibleAsin,
              value: serie.asin,
              extra: language,
            },
          ],
        })
      }

      const uniqueSeries = series.filter(
        (serie, index, self) => index === self.findIndex((s) => s.name === serie.name)
      )

      // @ts-ignore
      const createdSeries = await Series.fetchOrCreateMany(['name'], uniqueSeries, {
        allowExtraProperties: true,
      })

      await BooksHelper.addSeriesToBook(
        fullBook,
        createdSeries.flatMap((serie) => {
          return uniqueSeries
            .filter((s) => s.name === serie.name)
            .map((s) => ({
              id: serie.publicId,
              position: s.position ?? undefined,
            }))
        })
      )
    }

    if (payload.genres) {
      const createdGenres = await Genre.fetchOrCreateMany(
        ['name'],
        payload.genres.map((genre) => ({
          name: genre.name,
          type: genre.type as 'genre' | 'tag',
        })),
        {
          allowExtraProperties: true,
        }
      )

      await BooksHelper.addGenreToBook(
        fullBook,
        createdGenres.map((genre) => ({
          id: genre.publicId,
          type: genre.type,
        }))
      )
    }

    await ModelHelper.addIdentifier(fullBook, [
      {
        type: IdentifierType.AudibleAsin,
        value: payload.asin,
        extra: language,
      },
      // If isbn is not null, add it as an identifier
      // @ts-ignore
      ...(payload.isbn
        ? [
            {
              type: IdentifierType.Isbn,
              value: payload.isbn,
            },
          ]
        : []),
      // @ts-ignore
      ...(payload.skuGroup
        ? [
            {
              type: IdentifierType.AudibleSku,
              value: payload.skuGroup,
            },
          ]
        : []),
    ])

    if (payload.publisher) {
      const publisher: Infer<typeof publisherValidator> = {
        name: payload.publisher,
      }
      // @ts-ignore
      const publisherFound = await Publisher.firstOrCreate({ name: publisher.name }, publisher, {
        allowExtraProperties: true,
      })
      await BooksHelper.addPublisherToBook(book, { id: publisherFound.publicId })
    }

    await Book.enableBookAndRelations(fullBook.id)

    return fullBook
  }

  static async fetchAuthor(identifier: string, language: string): Promise<Contributor | undefined> {
    try {
      const result = await axios.get(
        `https://beta.audimeta.de/author/${identifier}?region=${language}`
      )
      const response = result.data

      const payload = await audiMetaAuthorValidator.validate(response)

      if (!payload.asin) new Error('ASIN is required for author')

      let author: Contributor
      const foundAuthors = await ModelHelper.findByIdentifier(
        Contributor,
        payload.asin!,
        IdentifierType.AudibleAsin
      )
      if (foundAuthors && foundAuthors.length > 0) {
        author = foundAuthors[0] as Contributor
        console.log('Found an author with the same ASIN, updating it')
      } else {
        author = new Contributor()
      }

      author.publicId = author.publicId ?? nanoid()
      author.name = author.name ?? payload.name
      author.description = author.description ?? payload.description ?? null

      if (payload.image && payload.image !== '' && !author.image) {
        const filePath = await FileHelper.saveFile(
          payload.image,
          'contributors',
          author.publicId,
          true,
          author.image
        )
        if (filePath) {
          author.image = filePath
        }
      }

      author.enabled = true

      author = await author.saveWithLog(LogState.APPROVED)

      await ModelHelper.addIdentifier(author, [
        {
          type: IdentifierType.AudibleAsin,
          value: payload.asin!,
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
      throw err
    }
  }

  static async fetchTracks(identifier: string, language: string) {
    const result = await axios.get(`https://audimeta.de/chapters/${identifier}?region=${language}`)

    const response = result.data

    const payload = await audiMetaTrackValidator.validate(response)
    const books: Book[] | null = (await ModelHelper.findByIdentifier(
      Book,
      identifier,
      IdentifierType.AudibleAsin
    )) as Book[] | null

    if (!books || books.length === 0) {
      throw new Error('Cannot add tracks to a book that does not exist')
    }

    const book: Book = books[0]

    const tracksData: any[] = []

    if (payload.brandIntroDurationMs) {
      tracksData.push({
        name: 'Audible Intro',
        start: 0,
        end: payload.brandIntroDurationMs,
        bookId: book.id,
        type: TrackType.PUBLISHER_INTRO,
      })
    }

    const processedChapters = payload.chapters.map((chapter, index) => {
      let start = chapter.startOffsetMs
      let end = chapter.startOffsetMs + chapter.lengthMs

      if (index === 0 && payload.brandIntroDurationMs) {
        start = Math.max(payload.brandIntroDurationMs, start)
      }

      if (index === payload.chapters.length - 1 && payload.brandOutroDurationMs) {
        end = end - payload.brandOutroDurationMs
      }

      return {
        name: chapter.title,
        start: start,
        end: end,
        bookId: book.id,
        type: TrackType.CHAPTER,
      }
    })

    tracksData.push(...processedChapters)

    if (payload.brandOutroDurationMs && payload.chapters.length > 0) {
      const lastChapter = payload.chapters[payload.chapters.length - 1]
      const lastChapterOriginalEnd = lastChapter.startOffsetMs + lastChapter.lengthMs

      tracksData.push({
        name: 'Audible Outro',
        start: lastChapterOriginalEnd - payload.brandOutroDurationMs,
        end: lastChapterOriginalEnd,
        bookId: book.id,
        type: TrackType.PUBLISHER_OUTRO,
      })
    }

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
      IdentifierType.AudibleAsin
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
        type: IdentifierType.AudibleAsin,
        value: payload.asin,
      },
    ])

    await series.saveWithLog()

    return series
  }
}
