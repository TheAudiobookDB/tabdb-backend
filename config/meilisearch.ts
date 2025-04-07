import env from '#start/env'
import { MeiliSearch } from 'meilisearch'

const client = new MeiliSearch({
  host: env.get('MEILISEARCH_HOST'),
  apiKey: env.get('MEILISEARCH_API_KEY'),
})

const bookIndex = client.index('books')
const authorIndex = client.index('authors')
const narratorIndex = client.index('narrators')
const genreIndex = client.index('genres')
const seriesIndex = client.index('series')

export { client, bookIndex, authorIndex, narratorIndex, genreIndex, seriesIndex }
