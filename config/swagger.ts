import path from 'node:path'
import url from 'node:url'

export default {
  path: path.dirname(url.fileURLToPath(import.meta.url)) + '/../',
  title: 'AudiobookDB',
  version: '1.0.1',
  description: '',
  tagIndex: 2,
  productionEnv: 'production',
  snakeCase: true,
  debug: false,
  ignore: ['/swagger', '/docs'],
  preferredPutPatch: 'PUT',
  common: {
    parameters: {
      page: {
        name: 'page',
        in: 'query',
        description: 'Page number',
        required: false,
        schema: {
          type: 'integer',
          default: 1,
          example: 3,
        },
      },
    },
    headers: {},
  },
  securitySchemes: {},
  authMiddlewares: ['auth', 'relaxAuth'],
  defaultSecurityScheme: 'BearerAuth',
  persistAuthorization: true,
  showFullPath: true,
}
