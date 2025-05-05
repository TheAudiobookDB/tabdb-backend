import { defineConfig } from '@foadonis/openapi'
import { ApiProperty, ApiPropertyOptional, ApiHeader, ApiQuery } from '@foadonis/openapi/decorators'

export default defineConfig({
  ui: 'scalar',
  document: {
    info: {
      title: 'TheAudiobookDB',
      version: process.env.npm_package_version || '1.0.0',
      contact: {
        name: 'TheAudiobookDB',
        url: 'https://beta.theaudiobookdb.com/about/contact',
        email: 'test@example.com',
      },
      termsOfService: 'https://beta.theaudiobookdb.com/about/api/terms-of-use',
      license: {
        name: 'https://beta.theaudiobookdb.com/about/api/terms-of-use',
      },
      description: 'Example',
    },
    servers: [
      {
        url: 'https://api.theaudiobookdb.com',
        description: 'Public Instance',
      },
      {
        url: 'http://localhost:3333',
        description: 'Local Dev',
      },
    ],
    security: [
      {},
      {
        Authorization: [],
      },
    ],
  },
})

export const commonNames = {
  updatedAt: 'The date when the resource was last updated',
  createdAt: 'The date when the resource was created',
}

export const createdAtApiProperty = () =>
  ApiPropertyOptional({
    description: 'The date when the resource was last updated',
    type: 'string',
    format: 'date-time',
    example: '2023-10-01T00:00:00Z',
    nullable: false,
  })

export const updatedAtApiProperty = () =>
  ApiPropertyOptional({
    description: 'The date when the resource was last updated',
    type: 'string',
    format: 'date-time',
    example: '2023-10-01T00:00:00Z',
    nullable: false,
  })

export const nanoIdApiProperty = () =>
  ApiProperty({
    description: 'The unique identifier of the resource. Is case sensitive.',
    type: 'string',
    example: '6pywk967huhwml9x',
    nullable: false,
    pattern: '^[a-z0-9]{16}$',
  })

export const languageApiProperty = () =>
  ApiPropertyOptional({
    description:
      'The language or country of the item. You should use the correct ISO codes:  \n' +
      '- For languages, use ISO 639-1 (e.g., "en" for English, "de" for German).  \n' +
      '- For language and country/region, use ISO 639-1 followed by ISO 3166-1 alpha-2 (e.g., "en-US" for English as used in the United States, "de-DE" for German as used in Germany).  \n' +
      'For compatibility, always use the format "xx" (ISO 639-1) or "xx-XX" (ISO 639-1 + ISO 3166-1 alpha-2)\n' +
      '\n' +
      'You can also use "English" or "German". But only for a very limited number.',
    type: 'string',
    example: 'en',
    nullable: false,
  })

export const limitApiProperty = () =>
  ApiHeader({
    name: 'x-ratelimit-limit',
    description:
      'The number of requests you can make in the current time window (mostly 1 minute).',
  })

export const remainingApiProperty = () =>
  ApiHeader({
    name: 'x-ratelimit-remaining',
    description: 'The number of requests you have left in the current time window.',
  })

export const requestIdApiProperty = () =>
  ApiHeader({
    name: 'x-request-id',
    description:
      'The unique identifier for the request. If you have any issues, please provide this ID to us.',
  })

export const pageApiQuery = () =>
  ApiQuery({
    name: 'page',
    description: 'The page number to retrieve. You will only be able to get at most 500 books.',
    type: 'integer',
    required: false,
    schema: {
      minimum: 1,
      maximum: 500,
    },
    example: 1,
  })

export const limitApiQuery = () =>
  ApiQuery({
    name: 'limit',
    description:
      'The number of items to retrieve per page. You will only be able to get at most 500 books (combined with the page).',
    type: 'integer',
    required: false,
    schema: {
      minimum: 1,
      maximum: 500,
    },
    example: 10,
  })

export const thresholdApiQuery = () =>
  ApiQuery({
    name: 'threshold',
    description:
      'The threshold for the search. The lower the number, the more results you will get. The higher the number, the less results you will get and the more accurate they will be.',
    type: 'number',
    required: false,
    schema: {
      minimum: 0.25,
      default: 0.35,
      maximum: 1,
    },
    example: 0,
  })

//

export const keywordApiQuery = () =>
  ApiQuery({
    name: 'keywords',
    description:
      'The keywords to search for in the the requested items. Will return items that can be far away from the wanted results. Do not use keywords if you are using some kind of automatching. It will match to broadly. You can try to contain it with other parameters. Note: title/name will overwrite the keywords, but still searches more broadly. So do not use title/name and keywords together unless you know what you want',
    type: 'string',
    example: ['Harry Potter', 'Series Name 1', 'Keyword 1', 'Simon Jäger'],
    required: false,
  })

export const nameApiQuery = () =>
  ApiQuery({
    name: 'name',
    description: 'The name of the item to search for.',
    type: 'string',
    example: ['Simon Jäger', 'David Nathan', 'Sebastian Fitzek'],
    required: false,
  })
