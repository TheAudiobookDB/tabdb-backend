import path from 'node:path'
import url from 'node:url'

export default {
  path: path.dirname(url.fileURLToPath(import.meta.url)) + '/../',
  title: 'AudiobookDB',
  version: '1.0.1',
  description: '',
  tagIndex: 1,
  productionEnv: 'production',
  snakeCase: true,
  debug: false,
  ignore: ['/swagger', '/docs'],
  authMiddlewares: ['auth', 'relaxAuth'],
  defaultSecurityScheme: 'BearerAuth',
  persistAuthorization: true,
  showFullPath: true,
  common: {
    headers: {
      rate: {
        'x-ratelimit-limit': {
          description: 'Total amount of requests',
          schema: { type: 'integer', example: 150 },
        },
        'x-ratelimit-remaining': {
          description: 'Remaining amount of requests',
          schema: { type: 'integer', example: 100 },
        },
      },
      requestId: {
        'x-request-id': {
          description: 'Request ID',
          schema: { type: 'string', example: '1234567890' },
        },
      },
    },
    parameters: {},
  },
}
