import type { HttpContext } from '@adonisjs/core/http'
import {
  searchBookValidator,
  searchContributorValidator,
  searchGenreValidator,
  searchSeriesValidator,
} from '#validators/search_validator'
import Book from '#models/book'
import { bookIndex, client, contributorIndex, genreIndex, seriesIndex } from '#config/meilisearch'
import Contributor from '#models/contributor'
import Series from '#models/series'

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
   * @paramQuery threshold - The threshold for the ranking score. - @type(number) @default(0.35)
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
    const limit = payload.limit ?? 10

    if (payload.author) {
      queries.push({
        indexUid: contributorIndex.uid,
        q: payload.author,
        attributesToSearchOn: ['name'],
        filterExpression: 'contributors.type = 1',
        limit: 3,
      })
    }
    if (payload.narrator) {
      queries.push({
        indexUid: contributorIndex.uid,
        q: payload.narrator,
        attributesToSearchOn: ['name'],
        filterExpression: 'contributors.type = 2',
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
        (result) => result.indexUid === contributorIndex.uid && result.query === payload.author
      )
      if (authorResult && authorResult.hits) {
        authorNames = authorResult.hits.map((author) => author.name)
      }
    }

    if (payload.narrator) {
      const narratorResult = multiSearchResults.results.find(
        (result) => result.indexUid === contributorIndex.uid && result.query === payload.narrator
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

    const authorFilterExpression = `(contributors IN ["${authorNames.join('","')}"] AND contributors.type = 1)`
    const narratorFilterExpression = `(contributors IN ["${narratorNames.join('","')}"] AND contributors.type = 2)`
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
    if (payload.language) {
      const [language, code] = payload.language.split('-')
      if (language && code) {
        filterExpression += filterExpression.length > 0 ? ' AND ' : ''
        filterExpression += `(language.language = "${language}" AND language.code = "${code}")`
      }
      if (language && !code) {
        filterExpression += filterExpression.length > 0 ? ' AND ' : ''
        filterExpression += `(language.language = "${language}")`
      }
    }

    const books = await bookIndex.search(payload.title || payload.keywords, {
      attributesToSearchOn: payload.keywords
        ? undefined
        : ['title', 'subtitle', 'series.name', 'series.position'],
      hitsPerPage: limit,
      page: page,
      filter: filterExpression,
      showRankingScore: true,
      rankingScoreThreshold: payload.threshold || 0.35,
    })
    if (!books || !books.hits || books.hits.length <= 0) {
      return {
        message: 'Books not found',
      }
    }

    const bookIds = books.hits.map((book) => book.id)

    const bookResults = await Book.query()
      .preload('contributors', (q) => q.pivotColumns(['role', 'type']))
      .preload('genres')
      .preload('identifiers')
      .preload('series')
      .preload('tracks')
      .preload('group')
      .where((builder) => {
        if (bookIds && bookIds.length > 0) {
          builder.whereIn('id', bookIds)
        }
        if (payload.publisher) {
          builder.where('publisher', payload.publisher)
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

  /**
   * @contributor
   * @operationId searchContributor
   * @summary Search for a contributor
   * @description Search for a contributor by name or keywords and return a paginated list.
   *
   * @paramQuery name - The name of the contributor to search for. - @type(string)
   * @paramQuery keywords - The keywords to search for a contributor. - @type(string)
   *
   * @paramQuery page - The page number to return. - @type(number) @default(1)
   * @paramQuery threshold - The threshold for the ranking score. - @type(number) @default(0.35)
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Contributor[]>.with(identifiers).exclude(books).paginated()
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async contributor({ request }: HttpContext) {
    const payload = await searchContributorValidator.validate(request.all())
    const page = payload.page ?? 1
    const limit = payload.limit ?? 10

    const contributors = await contributorIndex.search(payload.name || payload.keywords, {
      attributesToSearchOn: payload.keywords ? ['*'] : ['name'],
      hitsPerPage: limit,
      page: page,
      showRankingScore: true,
      rankingScoreThreshold: payload.threshold || 0.35,
    })

    if (!contributors || !contributors.hits || contributors.hits.length <= 0) {
      return { message: 'Narrators not found' }
    }

    const contributorsIds = contributors.hits.map((contributor) => contributor.id)

    const narratorResults = await Contributor.query()
      .preload('identifiers')
      .whereIn('id', contributorsIds)
      .orderByRaw(
        `CASE id ${contributorsIds.map((id, index) => `WHEN ${id} THEN ${index}`).join(' ')} END`
      )
      .paginate(1, limit)

    const result = narratorResults.serialize({})

    result.meta.total = contributors.totalHits
    result.meta.lastPage = Math.ceil(contributors.totalHits / limit)
    result.meta.page = page
    result.meta.lastPageUrl = `/?page=${result.meta.lastPage}`
    result.meta.nextPageUrl = page + 1 <= result.meta.lastPage ? `/?page=${page + 1}` : null
    result.meta.previousPageUrl = page - 1 >= 1 ? `/?page=${page - 1}` : null
    result.meta.currentPage = page

    return result
  }

  /**
   * @genre
   * @operationId searchGenre
   * @summary Search for a genre
   * @description Search for a genre by name or keywords and return a paginated list.
   *
   * @paramQuery name - The name of the genre to search for. - @type(string)
   * @paramQuery type - The type of the genre to search for. - @enum(tag, genre)
   *
   * @paramQuery page - The page number to return. - @type(number) @default(1)
   * @paramQuery threshold - The threshold for the ranking score. - @type(number) @default(0.35)
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Genre[]>.exclude(books).paginated()
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async genre({ request }: HttpContext) {
    const payload = await searchGenreValidator.validate(request.all())
    const page = payload.page ?? 1
    const limit = payload.limit ?? 10

    const genres = await genreIndex.search(payload.name, {
      attributesToSearchOn: ['name'],
      hitsPerPage: limit,
      page: page,
      filter: payload.type ? `type = "${payload.type}"` : undefined,
      showRankingScore: true,
      rankingScoreThreshold: payload.threshold || 0.35,
    })

    return {
      hits: genres.hits,
      meta: {
        total: genres.totalHits,
        lastPage: Math.ceil(genres.totalHits / limit),
        page: page,
        lastPageUrl: `/?page=${Math.ceil(genres.totalHits / limit)}`,
        nextPageUrl: page + 1 <= Math.ceil(genres.totalHits / limit) ? `/?page=${page + 1}` : null,
        previousPageUrl: page - 1 >= 1 ? `/?page=${page - 1}` : null,
        currentPage: page,
      },
    }
  }

  /**
   * @series
   * @operationId searchSeries
   * @summary Search for a series
   * @description Search for a series by name or keywords and return a paginated list.
   *
   * @paramQuery name - The name of the series to search for. - @type(string)
   * @paramQuery keywords - The keywords to search for a series. - @type(string)
   *
   * @paramQuery page - The page number to return. - @type(number) @default(1)
   * @paramQuery threshold - The threshold for the ranking score. - @type(number) @default(0.35)
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Series[]>.with(identifiers).exclude(books).paginated()
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async series({ request }: HttpContext) {
    const payload = await searchSeriesValidator.validate(request.all())
    const page = payload.page ?? 1
    const limit = payload.limit ?? 10

    const series = await seriesIndex.search(payload.name || payload.keywords, {
      attributesToSearchOn: payload.keywords ? ['*'] : ['name'],
      hitsPerPage: limit,
      page: page,
      showRankingScore: true,
      rankingScoreThreshold: payload.threshold || 0.35,
    })

    if (!series || !series.hits || series.hits.length <= 0) {
      return { message: 'Narrators not found' }
    }

    const narratorIds = series.hits.map((serie) => serie.id)

    const seriesResults = await Series.query()
      .preload('identifiers')
      .whereIn('id', narratorIds)
      .orderByRaw(
        `CASE id ${narratorIds.map((id, index) => `WHEN ${id} THEN ${index}`).join(' ')} END`
      )
      .paginate(1, limit)

    const result = seriesResults.serialize({})

    result.meta.total = series.totalHits
    result.meta.lastPage = Math.ceil(series.totalHits / limit)
    result.meta.page = page
    result.meta.lastPageUrl = `/?page=${result.meta.lastPage}`
    result.meta.nextPageUrl = page + 1 <= result.meta.lastPage ? `/?page=${page + 1}` : null
    result.meta.previousPageUrl = page - 1 >= 1 ? `/?page=${page - 1}` : null
    result.meta.currentPage = page

    return result
  }
}
