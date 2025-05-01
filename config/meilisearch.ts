import env from '#start/env'
import { MeiliSearch } from 'meilisearch'

const client = new MeiliSearch({
  host: env.get('MEILISEARCH_HOST'),
  apiKey: env.get('MEILISEARCH_API_KEY'),
})

const bookIndex = client.index('books')
const contributorIndex = client.index('contributors')
const genreIndex = client.index('genres')
const seriesIndex = client.index('series')
const publisherIndex = client.index('publishers')

await bookIndex.updateSettings({
  filterableAttributes: [
    'contributors.name',
    'contributors.type',
    'genres',
    'series.name',
    'language.language',
    'language.code',
    'isExplicit',
    'isAbridged',
    'releasedAt',
  ],
  sortableAttributes: ['title', 'type', 'duration', 'pages', 'releasedAt', 'language.language'],
  //rankingRules: ['sort', 'words', 'typo', 'proximity', 'attribute', 'exactness'],
})

await genreIndex.updateSettings({
  filterableAttributes: ['type'],
})

export { client, bookIndex, contributorIndex, genreIndex, seriesIndex, publisherIndex }
