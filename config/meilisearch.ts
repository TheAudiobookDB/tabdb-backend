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

await bookIndex.updateSettings({
  filterableAttributes: [
    'contributors.name',
    'contributors.type',
    'genres',
    'series.name',
    'language.language',
    'language.code',
  ],
})

await genreIndex.updateSettings({
  filterableAttributes: ['type'],
})

export { client, bookIndex, contributorIndex, genreIndex, seriesIndex }
