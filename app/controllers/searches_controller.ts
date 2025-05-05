import type { HttpContext } from '@adonisjs/core/http'
import {
  searchBookValidator,
  searchContributorValidator,
  searchGenreValidator,
  searchSeriesValidator,
} from '#validators/search_validator'
import Book from '#models/book'
import {
  bookIndex,
  client,
  contributorIndex,
  genreIndex,
  publisherIndex,
  seriesIndex,
} from '#config/meilisearch'
import Contributor from '#models/contributor'
import Series from '#models/series'
import { SearchEngineHelper } from '../helpers/search_engine.js'
import { SearchBookDto } from '#dtos/book'
import { ContributorBaseDto } from '#dtos/contributor'
import { SeriesBaseDto } from '#dtos/series'
import Publisher from '#models/publisher'
import { PublisherMinimalDto } from '#dtos/publisher'
import { GenreBaseDto } from '#dtos/genre'
import Genre from '#models/genre'
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@foadonis/openapi/decorators'
import {
  keywordApiQuery,
  limitApiProperty,
  limitApiQuery,
  nameApiQuery,
  pageApiQuery,
  remainingApiProperty,
  requestIdApiProperty,
  thresholdApiQuery,
  tooManyRequestsApiResponse,
  validationErrorApiResponse,
} from '#config/openapi'
import {
  ContributorBaseDtoPaginated,
  GenreBaseDtoPaginated,
  PublisherMinimalDtoPaginated,
  SearchBookDtoPaginated,
  SeriesBaseDtoPaginated,
} from '#dtos/pagination'

@ApiTags('Search')
@requestIdApiProperty()
@limitApiProperty()
@remainingApiProperty()
@validationErrorApiResponse()
@tooManyRequestsApiResponse()
export default class SearchesController {
  @ApiQuery({
    name: 'title',
    description: 'The title of the book to search for.',
    type: 'string',
    example: 'Sample Title',
    required: false,
  })
  @ApiQuery({
    name: 'subtitle',
    description: 'The subtitle of the book to search for.',
    type: 'string',
    example: 'Sample Subtitle',
    required: false,
  })
  @ApiQuery({
    name: 'author',
    description: 'The author of the book to search for. Allows typo',
    type: 'string',
    example: 'Sample Author',
    required: false,
  })
  @ApiQuery({
    name: 'narrator',
    description: 'The narrator of the book to search for. Allows typo',
    type: 'string',
    example: 'Sample Narrator',
    required: false,
  })
  @ApiQuery({
    name: 'publisher',
    description: 'The publisher of the book to search for.',
    type: 'string',
    example: 'Sample Publisher',
    required: false,
  })
  @ApiQuery({
    name: 'language',
    description: 'The language of the book to search for.',
    type: 'string',
    example: 'en-US',
    required: false,
  })
  @ApiQuery({
    name: 'genre',
    description: 'The genre of the book to search for.',
    type: 'string',
    example: 'Science Fiction',
    required: false,
  })
  @ApiQuery({
    name: 'series',
    description: 'The series of the book to search for.',
    type: 'string',
    example: 'Harry Potter',
    required: false,
  })
  @ApiQuery({
    name: 'releasedAfter',
    description: 'The date after which the book was released.',
    type: 'string',
    example: '2023-10-01T00:00:00Z',
    required: false,
  })
  @ApiQuery({
    name: 'releasedBefore',
    description: 'The date before which the book was released.',
    type: 'string',
    example: '2023-10-01T00:00:00Z',
    required: false,
  })
  @ApiQuery({
    name: 'isExplicit',
    description: 'Indicates whether to filter for explicit books.',
    type: 'boolean',
    example: false,
    required: false,
  })
  @ApiQuery({
    name: 'isAbridged',
    description: 'Indicates whether to filter for abridged books.',
    type: 'boolean',
    example: false,
    required: false,
  })
  @ApiQuery({
    name: 'type',
    description: 'The type of the book to search for.',
    type: 'string',
    enum: ['book', 'audiobook', 'podcast', 'e-book'],
    example: 'audiobook',
    required: false,
  })
  @ApiQuery({
    name: 'sort',
    description: 'Sort order for the results (e.g., title, -releasedAt).',
    type: 'string',
    enum: [
      'title',
      '-title',
      'releasedAt',
      '-releasedAt',
      'type',
      'duration',
      '-duration',
      'pages',
      '-pages',
      'language',
      'random',
    ],
    required: false,
    explode: false,
  })
  @ApiOperation({
    summary: 'Search for a book',
    description: 'Search for a book by multiple criteria and return a paginated list of books.',
    operationId: 'searchBook',
    tags: ['Book'],
  })
  @keywordApiQuery()
  @pageApiQuery()
  @limitApiQuery()
  @thresholdApiQuery()
  @ApiResponse({ type: SearchBookDtoPaginated, status: 200 })
  async book({ request }: HttpContext) {
    const payload = await searchBookValidator.validate(request.all())
    const queries = []
    const page = Number.parseInt(request.input('page', 1))
    const limit = payload.limit ?? 10

    if (payload.sort && payload.sort.includes('random') && payload.sort.length > 1) {
      throw Error('Random sort must be the only sort')
    }
    if (payload.sort && payload.sort.includes('random')) {
      const allowedAttributes = [
        'releasedAfter',
        'releasedBefore',
        'isExplicit',
        'isAbridged',
        'type',
        'page',
        'limit',
        'sort',
      ]
      const otherAttributes = Object.keys(payload).filter(
        (attr) => !allowedAttributes.includes(attr)
      )
      if (otherAttributes.length > 0) {
        throw Error(
          'Random sort can only include the following attributes: ' + allowedAttributes.join(', ')
        )
      }
    }
    if (payload.sort && payload.sort.includes('random')) {
      return SearchBookDto.fromPaginator(
        await Book.query()
          .withScopes((s) => s.minimalAll())
          .where((builder) => {
            if (payload.releasedAfter) builder.where('releasedAt', '>=', payload.releasedAfter)
            if (payload.releasedBefore) builder.where('releasedAt', '<=', payload.releasedBefore)
            if (payload.isExplicit) builder.where('isExplicit', payload.isExplicit)
            if (payload.isAbridged) builder.where('isAbridged', payload.isAbridged)
            if (payload.type) builder.where('type', payload.type)
          })
          .orderByRaw(`RANDOM()`)
          .paginate(page, limit)
      )
    }

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

    if (payload.publisher) {
      const publisherResult = multiSearchResults.results.find(
        (result) => result.indexUid === publisherIndex.uid
      )
      if (publisherResult && publisherResult.hits) {
        seriesNames = publisherResult.hits.map((series) => series.name)
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
    if (payload.isExplicit) {
      filterExpression += filterExpression.length > 0 ? ' AND ' : ''
      filterExpression += `isExplicit = ${payload.isExplicit ? 'true' : 'false'}`
    }
    if (payload.isAbridged) {
      filterExpression += filterExpression.length > 0 ? ' AND ' : ''
      filterExpression += `isAbridged = ${payload.isAbridged ? 'true' : 'false'}`
    }
    if (payload.releasedAfter) {
      filterExpression += filterExpression.length > 0 ? ' AND ' : ''
      filterExpression += `releasedAt >= "${payload.releasedAfter.getTime()}" `
    }
    if (payload.releasedBefore) {
      filterExpression += filterExpression.length > 0 ? ' AND ' : ''
      filterExpression += `releasedAt <= "${payload.releasedBefore.getTime()}" `
    }

    let sortArray: string[] = []
    if (payload.sort) {
      sortArray = payload.sort.map((sort) => {
        const isAsc: boolean = sort.startsWith('-')

        return `${sort.replace('-', '')}:${isAsc ? 'desc' : 'asc'}`
      })
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
      ...(sortArray.length > 0 ? { sort: sortArray } : {}),
    })
    if (!books || !books.hits || books.hits.length <= 0) {
      return {
        message: 'Books not found',
      }
    }

    const bookIds = books.hits.map((book) => book.id)

    const bookResults = await Book.query()
      .withScopes((s) => s.minimalAll())
      .where((builder) => {
        if (bookIds && bookIds.length > 0) {
          builder.whereIn('id', bookIds)
        }
      })
      .orderByRaw(`CASE id ${bookIds.map((id, index) => `WHEN ${id} THEN ${index}`).join(' ')} END`)
      .paginate(1, limit)

    const result = SearchBookDto.fromPaginator(bookResults)

    result.meta = SearchEngineHelper.buildPagination(page, books.totalHits, limit)

    return result
  }

  @ApiOperation({
    summary: 'Search for a contributor',
    description: 'Search for a contributor by name or keywords and return a paginated list.',
    operationId: 'searchContributor',
    tags: ['Contributor'],
  })
  @nameApiQuery()
  @keywordApiQuery()
  @pageApiQuery()
  @limitApiQuery()
  @thresholdApiQuery()
  @ApiResponse({ type: ContributorBaseDtoPaginated, status: 200 })
  async contributor({ request }: HttpContext) {
    const payload = await searchContributorValidator.validate(request.all())
    const page = payload.page ?? 1
    const limit = payload.limit ?? 10

    if (payload.sort && payload.sort.includes('random') && payload.sort.length > 1) {
      throw Error('Random sort must be the only sort')
    }
    if (payload.sort && payload.sort.includes('random')) {
      return ContributorBaseDto.fromPaginator(
        await Contributor.query()
          .preload('identifiers')
          .orderByRaw(`RANDOM()`)
          .paginate(page, limit)
      )
    }

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

    const result = ContributorBaseDto.fromPaginator(narratorResults)

    result.meta = SearchEngineHelper.buildPagination(page, contributors.totalHits, limit)

    return result
  }

  @ApiOperation({
    summary: 'Search for a genre',
    description: 'Search for a genre by name or keywords and return a paginated list.',
    operationId: 'searchGenre',
    tags: ['Genre'],
  })
  @ApiQuery({
    name: 'type',
    description: 'The type of the genre to search for.',
    type: 'string',
    enum: ['tag', 'genre'],
    example: 'tag',
    required: false,
  })
  @nameApiQuery()
  @pageApiQuery()
  @limitApiQuery()
  @thresholdApiQuery()
  @ApiResponse({ type: GenreBaseDtoPaginated, status: 200 })
  async genre({ request }: HttpContext) {
    const payload = await searchGenreValidator.validate(request.all())
    const page = payload.page ?? 1
    const limit = payload.limit ?? 10

    if (payload.sort && payload.sort.includes('random') && payload.sort.length > 1) {
      throw Error('Random sort must be the only sort')
    }
    if (payload.sort && payload.sort.includes('random')) {
      return GenreBaseDto.fromPaginator(
        await Genre.query()
          .where((builder) => {
            if (payload.type) builder.where('type', payload.type)
          })
          .orderByRaw(`RANDOM()`)
          .paginate(page, limit)
      )
    }

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
      meta: SearchEngineHelper.buildPagination(page, genres.totalHits, limit),
    }
  }

  @ApiOperation({
    summary: 'Search for a series',
    description: 'Search for a series by name or keywords and return a paginated list.',
    operationId: 'searchSeries',
    tags: ['Series'],
  })
  @nameApiQuery()
  @keywordApiQuery()
  @pageApiQuery()
  @limitApiQuery()
  @thresholdApiQuery()
  @ApiResponse({ type: SeriesBaseDtoPaginated, status: 200 })
  async series({ request }: HttpContext) {
    const payload = await searchSeriesValidator.validate(request.all())
    const page = payload.page ?? 1
    const limit = payload.limit ?? 10

    if (payload.sort && payload.sort.includes('random') && payload.sort.length > 1) {
      throw Error('Random sort must be the only sort')
    }
    if (payload.sort && payload.sort.includes('random')) {
      return SeriesBaseDto.fromPaginator(
        await Series.query()
          .preload('identifiers')
          .where((builder) => {
            if (payload.language) builder.where('language', payload.language)
          })
          .orderByRaw(`RANDOM()`)
          .paginate(page, limit)
      )
    }

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

    const result = SeriesBaseDto.fromPaginator(seriesResults)

    result.meta = SearchEngineHelper.buildPagination(page, series.totalHits, limit)

    return result
  }

  @ApiOperation({
    summary: 'Search for a publisher',
    description: 'Search for a publisher by name and return a paginated list.',
    operationId: 'searchPublisher',
    tags: ['Publisher'],
  })
  @nameApiQuery()
  @pageApiQuery()
  @limitApiQuery()
  @thresholdApiQuery()
  @ApiResponse({ type: PublisherMinimalDtoPaginated, status: 200 })
  async publisher({ request }: HttpContext) {
    const payload = await searchSeriesValidator.validate(request.all())
    const page = payload.page ?? 1
    const limit = payload.limit ?? 10

    if (payload.sort && payload.sort.includes('random') && payload.sort.length > 1) {
      throw Error('Random sort must be the only sort')
    }
    if (payload.sort && payload.sort.includes('random')) {
      return PublisherMinimalDto.fromPaginator(
        await Publisher.query().orderByRaw(`RANDOM()`).paginate(page, limit)
      )
    }

    const publishers = await publisherIndex.search(payload.name, {
      attributesToSearchOn: ['name'],
      hitsPerPage: limit,
      page: page,
      showRankingScore: true,
      rankingScoreThreshold: payload.threshold || 0.35,
    })

    const publisherIds = publishers.hits.map((publisher) => publisher.id)

    if (!publishers || !publishers.hits || publishers.hits.length <= 0) {
      return { message: 'Publisher not found' }
    }

    const publisherResults = await Publisher.query()
      .whereIn('id', publisherIds)
      .orderByRaw(
        `CASE id ${publisherIds.map((id, index) => `WHEN ${id} THEN ${index}`).join(' ')} END`
      )
      .paginate(1, limit)

    return {
      hits: PublisherMinimalDto.fromPaginator(publisherResults),
      meta: SearchEngineHelper.buildPagination(page, publishers.totalHits, limit),
    }
  }
}
