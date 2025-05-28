import { defineConfig } from '@foadonis/openapi'
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiResponse,
  ApiParam,
  ApiResponseOptions,
  ApiBearerAuth,
} from '@foadonis/openapi/decorators'

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
      description: 'This API only includes sample data. Using is strictly prohibited.',
    },
    servers: [
      {
        url: 'https://api.theaudiobookdb.com',
        description: 'Public Instance',
      },
      {
        url: 'http://dev.theaudiobookdb.com:3333',
        description: 'Local Dev',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Authentication with a Bearer token. Example: Authorization: Bearer <token>',
        },
        CookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'Authorization',
          description:
            "Authentication via a session cookie named 'Authorization'. The cookie should be sent automatically by the browser or client.",
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
      {
        CookieAuth: ['Authorization'],
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

const headers = {
  'x-request-id': {
    description:
      'A unique identifier for the request. If you have any issues, please provide this ID to us.',
    schema: {
      type: 'string',
      pattern: '^[a-z0-9]{24}$',
      example: 'e667bhmtdw07kop6irbg2m9y',
    },
  },
}

const rateLimitHeaders = {
  'x-ratelimit-limit': {
    description: 'The maximum number of requests you can make in the current time window.',
    schema: {
      type: 'integer',
      example: 100,
    },
  },
  'x-ratelimit-remaining': {
    description: 'The number of requests you have left in the current time window.',
    schema: {
      type: 'integer',
      example: 100,
    },
  },
}

export const successApiResponse = (options: ApiResponseOptions) =>
  ApiResponse({
    // @ts-ignore
    //headers: { headers, ...rateLimitHeaders },
    status: 200,
    description: 'Success',
    ...options,
  })

export const pageApiQuery = (defaultNum: number = 1) =>
  ApiQuery({
    name: 'page',
    description: 'The page number to retrieve. You will only be able to get at most 500 books.',
    type: 'integer',
    required: false,
    schema: {
      minimum: 1,
      maximum: 500,
      default: defaultNum,
    },
    example: 1,
  })

export const limitApiQuery = (defaultNum: number = 10) =>
  ApiQuery({
    name: 'limit',
    description:
      'The number of items to retrieve per page. You will only be able to get at most 500 books (combined with the page).',
    type: 'integer',
    required: false,
    schema: {
      minimum: 1,
      maximum: 500,
      default: defaultNum,
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

export const nanoIdsApiQuery = () =>
  ApiQuery({
    name: 'ids',
    description:
      'The unique identifiers of the resources. Is case sensitive. You can use the public ids or the internal ids.',
    schema: {
      type: 'array',
      items: {
        type: 'string',
        pattern: '^[a-z0-9]{16}$',
      },
    },
    example: ['6pywk967huhwml9x', '7abcf123def456gh'],
    required: true,
    explode: false,
  })

export const nanoIdApiPathParameter = () =>
  ApiParam({
    name: 'id',
    description:
      'The unique identifier of the resource. Is case sensitive. You can use the public id or the internal id.',
    type: 'string',
    example: '6pywk967huhwml9x',
    required: true,
    schema: {
      pattern: '^[a-z0-9]{16}$',
    },
  })

//

export const tooManyRequestsApiResponse = () =>
  ApiResponse({
    // @ts-ignore
    //headers: { headers, ...rateLimitHeaders },
    status: 429,
    description: 'Too many requests',
    mediaType: 'application/json',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'You have exceeded the rate limit. Please try again later.',
        },
        retryAfter: {
          type: 'integer',
          example: 60,
        },
      },
    },
  })

export const validationErrorApiResponse = () =>
  ApiResponse({
    // @ts-ignore
    //headers: { headers, ...rateLimitHeaders },
    status: 422,
    description: 'Validation error',
    mediaType: 'application/json',
    schema: {
      type: 'object',
      properties: {
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: {
                type: 'string',
                example: 'name',
                description: 'The name of the field that caused the error.',
              },
              message: {
                type: 'string',
                example: 'The name is required.',
                description: 'The error message for that field.',
              },
              rule: {
                type: 'string',
                example: 'required',
                description: 'The validation rule that failed.',
              },
            },
          },
        },
      },
    },
  })

export const notFoundApiResponse = () =>
  ApiResponse({
    // @ts-ignore
    //headers: { headers, ...rateLimitHeaders },
    status: 404,
    description: 'Resource not found',
    mediaType: 'application/json',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Resource not found',
        },
        requestId: {
          type: 'string',
          example: 'sbq3l6jl0a2fpqnkydlwl9mu',
          description:
            'The unique identifier for the request. If you have any issues, please provide this ID to us.',
        },
      },
    },
  })

export const unauthorizedApiResponse = () =>
  ApiResponse({
    // @ts-ignore
    //headers: headers,
    status: 401,
    description: 'Unauthorized',
    mediaType: 'application/json',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Unauthorized',
        },
        requestId: {
          type: 'string',
          example: 'sbq3l6jl0a2fpqnkydlwl9mu',
          description:
            'The unique identifier for the request. If you have any issues, please provide this ID to us.',
        },
      },
    },
  })

export const forbiddenApiResponse = (message: string = 'A duplicate entry already exists') =>
  ApiResponse({
    // @ts-ignore
    //headers: headers,
    status: 403,
    description: `Forbidden - ${message}`,
    mediaType: 'application/json',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Forbidden',
        },
        requestId: {
          type: 'string',
          example: 'sbq3l6jl0a2fpqnkydlwl9mu',
          description:
            'The unique identifier for the request. If you have any issues, please provide this ID to us.',
        },
      },
    },
  })

export const badRequestApiResponse = () =>
  ApiResponse({
    // @ts-ignore
    //headers: headers,
    status: 400,
    description: 'Bad request',
    mediaType: 'application/json',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Bad request',
        },
        requestId: {
          type: 'string',
          example: 'sbq3l6jl0a2fpqnkydlwl9mu',
          description:
            'The unique identifier for the request. If you have any issues, please provide this ID to us.',
        },
      },
    },
  })

export const duplicateApiResponse = (dto: string) =>
  ApiResponse({
    // @ts-ignore
    //headers: headers,
    status: 409,
    description: 'Duplicate entry',
    mediaType: 'application/json',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'A duplicate entry already exists',
        },
        requestId: {
          type: 'string',
          example: 'sbq3l6jl0a2fpqnkydlwl9mu',
          description:
            'The unique identifier for the request. If you have any issues, please provide this ID to us.',
        },
        data: {
          $ref: `#/components/schemas/${dto}`,
        },
      },
    },
  })

export const createdApiResponse = (dataDto: string, duplicateDto: string) =>
  successApiResponse({
    status: 201,
    description:
      'Indicates the item was created successfully, or with a pending status if potential duplicates were found.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description:
            'A summary of the outcome. Returns a success message on standard creation, or explains that the item was created in a pending state due to possible duplicates. If pending, an activation link is provided. The activation link remains valid for 7 days; after this period, the pending item will be deleted.',
          example: 'Contributor created successfully',
        },
        data: { $ref: `#/components/schemas/${dataDto}` },
        activationLink: {
          type: 'string',
          description:
            'A URL to activate the newly created item, valid for 7 days. After this period, the item will be deleted if not activated. Items created in a pending state require activation searchable and usable. Items need to be approved afterwards by an moderator and can be deleted at any point. For books, moderator approval is mandatory before search is enabled.',
        },
        duplicates: {
          description:
            'An array listing potential duplicate items found during creation. Useful for displaying alternatives to the user and avoiding duplicate entries.',
          type: 'array',
          items: { $ref: `#/components/schemas/${duplicateDto}` },
        },
      },
      required: ['message', 'data'],
    },
  })
