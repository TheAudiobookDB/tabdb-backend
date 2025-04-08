import type { HttpContext } from '@adonisjs/core/http'
import { searchBookValidator } from '#validators/search_validator'
import Book from '#models/book'
import {
  authorIndex,
  bookIndex,
  client,
  genreIndex,
  narratorIndex,
  seriesIndex,
} from '#config/meilisearch'

export default class SearchesController {
  /**
   * @book
   * @operationId searchBook
   * @summary Search for a book
   * @description Search for a book by multiple criteria and return a paginated list of books.
   *
   * @paramQuery title - The title of the book to search for. - @type(string)
   * @paramQuery subtitle - The subtitle of the book to search for. - @type(string)
   * @paramQuery keywords - The keywords to search for in the book. Will return books that can be far away from the wanted results. Do not use keywords if you are using some kind of automatching. It will match to broadly. You can try to contain it with other paramters. Note: title will overwrite the keywords, but still searches more broadly. So do not use title and keywords together unless you know what you want - @type(string)
   * @paramQuery author - The author of the book to search for. - @type(string)
   * @paramQuery narrator - The narrator of the book to search for. - @type(string)
   * @paramQuery genre - The genre of the book to search for. - @type(string)
   * @paramQuery series - The series of the book to search for. - @type(string)
   * @paramQuery publisher - The publisher of the book to search for. Note: This must be an exact match! - @type(string)
   * @paramQuery language - The language of the book to search for. - @type(string)
   * @paramQuery type - The type of the book to search for. - @enum(book, audiobook, podcast)
   *
   * @paramQuery isExplicit - Indicates whether to filter for explicit books. Note: This filter is applied *after* the search query is executed. If no results are returned, it means that no books matching both the search criteria and the explicit filter were found on that page. It does *not* imply that no such books exist at all. - @type(boolean)
   * @paramQuery isAbridged - Indicates whether to filter for abridged books. Note: This filter is applied *after* the search query is executed. If no results are returned, it means that no books matching both the search criteria and the abridged filter were found on that page. It does *not* imply that no such books exist at all. - @type(boolean)
   * @paramQuery releasedAfter - The date after which the book was released. Note: This filter is applied *after* the search query is executed. If no results are returned, it means that no books matching both the search criteria and the releasedAfter filter were found on that page. It does *not* imply that no such books exist at all. - @type(date)
   * @paramQuery releasedBefore - The date before which the book was released. Note: This filter is applied *after* the search query is executed. If no results are returned, it means that no books matching both the search criteria and the releasedBefore filter were found on that page. It does *not* imply that no such books exist at all. - @type(date)
   *
   * @paramQuery page - The page number to return. - @type(number) @default(1)
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Book[]>.with(relations).paginated()
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async book({ request }: HttpContext) {
    const payload = await searchBookValidator.validate(request.all())
    const queries = []
    const page = Number.parseInt(request.input('page', 1))
    const limit = 10

    if (payload.author) {
      queries.push({
        indexUid: authorIndex.uid,
        q: payload.author,
        attributesToSearchOn: ['name'],
        limit: 3,
      })
    }
    if (payload.narrator) {
      queries.push({
        indexUid: narratorIndex.uid,
        q: payload.narrator,
        attributesToSearchOn: ['name'],
        limit: 3,
      })
    }
    if (payload.genre) {
      queries.push({
        indexUid: genreIndex.uid,
        q: payload.genre,
        attributesToSearchOn: ['name'],
        limit: 1,
      })
    }
    console.log(payload.series)
    if (payload.series) {
      queries.push({
        indexUid: seriesIndex.uid,
        q: payload.series,
        attributesToSearchOn: ['name'],
        limit: 2,
      })
    }

    const multiSearchResults = await client.multiSearch({ queries })

    let authorNames = []
    let narratorNames = []
    let genreNames = []
    let seriesNames = []

    if (payload.author && multiSearchResults.results[0]?.hits?.length) {
      const authorResult = multiSearchResults.results.find(
        (result) => result.indexUid === authorIndex.uid
      )
      if (authorResult && authorResult.hits) {
        authorNames = authorResult.hits.map((author) => author.name)
      }
    }

    if (payload.narrator) {
      const narratorResult = multiSearchResults.results.find(
        (result) => result.indexUid === narratorIndex.uid
      )
      if (narratorResult && narratorResult.hits) {
        narratorNames = narratorResult.hits.map((narrator) => narrator.name)
      }
    }

    if (payload.genre) {
      const genreResult = multiSearchResults.results.find(
        (result) => result.indexUid === genreIndex.uid
      )
      if (genreResult && genreResult.hits) {
        genreNames = genreResult.hits.map((genre) => genre.name)
      }
    }

    if (payload.series) {
      const seriesResult = multiSearchResults.results.find(
        (result) => result.indexUid === seriesIndex.uid
      )
      if (seriesResult && seriesResult.hits) {
        seriesNames = seriesResult.hits.map((series) => series.name)
      }
    }

    const authorFilterExpression = `(authors IN ["${authorNames.join('","')}"])`
    const narratorFilterExpression = `(narrators IN ["${narratorNames.join('","')}"])`
    const genreFilterExpression = `(genres IN ["${genreNames.join('","')}"])`
    const seriesFilterExpression = `(series.name IN ["${seriesNames.join('","')}"])`

    let filterExpression = ''
    if (authorNames.length > 0) {
      filterExpression += authorFilterExpression
    }
    if (narratorNames.length > 0) {
      filterExpression += filterExpression.length > 0 ? ' AND ' : ''
      filterExpression += narratorFilterExpression
    }
    if (payload.genre) {
      filterExpression += filterExpression.length > 0 ? ' AND ' : ''
      filterExpression += genreFilterExpression
    }
    if (payload.series) {
      filterExpression += filterExpression.length > 0 ? ' AND ' : ''
      filterExpression += seriesFilterExpression
    }
    if (payload.type) {
      filterExpression += filterExpression.length > 0 ? ' AND ' : ''
      filterExpression += `type = "${payload.type}"`
    }

    console.log('Filter expression:', filterExpression)

    const books = await bookIndex.search(payload.title || payload.keywords, {
      attributesToSearchOn: payload.keywords ? undefined : ['title', 'subtitle'],
      limit: limit,
      page: page,
      filter: filterExpression,
    })
    if (!books || !books.hits || books.hits.length <= 0) {
      return {
        message: 'Books not found',
      }
    }

    const bookIds = books.hits.map((book) => book.id)

    const bookResults = await Book.query()
      .whereIn('id', bookIds)
      .preload('authors')
      .preload('narrators')
      .preload('genres')
      .preload('identifiers')
      .preload('series')
      .preload('tracks')
      .preload('group')
      .where((builder) => {
        if (payload.publisher) {
          builder.where('publisher', payload.publisher)
        }
        if (payload.language) {
          builder.where('language', payload.language)
        }
        if (payload.isExplicit) {
          builder.where('is_explicit', payload.isExplicit)
        }
        if (payload.isAbridged) {
          builder.where('is_abridged', payload.isAbridged)
        }
        if (payload.releasedAfter) {
          builder.where('released_at', '>=', payload.releasedAfter)
        }
        if (payload.releasedBefore) {
          builder.where('released_at', '<=', payload.releasedBefore)
        }
      })
      .orderByRaw(`CASE id ${bookIds.map((id, index) => `WHEN ${id} THEN ${index}`).join(' ')} END`)
      .paginate(1, limit)

    const result = bookResults.serialize({})

    result.meta.total = books.totalHits
    result.meta.lastPage = Math.ceil(books.totalHits / limit)
    result.meta.page = page
    result.meta.lastPageUrl = `/?page=${result.meta.lastPage}`
    result.meta.nextPageUrl = page + 1 <= result.meta.lastPage ? `/?page=${page + 1}` : null
    result.meta.previousPageUrl = page - 1 >= 1 ? `/?page=${page - 1}` : null
    result.meta.currentPage = page

    return result
  }
}
