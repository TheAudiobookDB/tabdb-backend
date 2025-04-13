import path from 'node:path'
import url from 'node:url'

export default {
  path: path.dirname(url.fileURLToPath(import.meta.url)) + '/../',
  title: 'The Audiobook Database',
  version: process.env.npm_package_version,
  description:
    'This document constitutes the official API documentation for The Audiobook Database.<br>' +
    'Users are granted a non-exclusive, non-transferable license to access and use the API solely for lawful and responsible purposes.<br>' +
    "In order to safeguard our services and data, strict rate limiting is enforced, which may vary according to the user's login status.<br>" +
    'By using this API, you agree unconditionally to adhere to all specified conditions.<br>' +
    'You may incorporate the provided data into your projects only if its use strictly complies with these terms.<br>' +
    'Any attempt to misuse the API or the data—including, but not limited to, data redistribution, data modification, or any form of commercial — will be considered a material breach of these conditions.<br>' +
    'Under no circumstances shall the data be employed to generate any form of financial gain, either directly or indirectly, by you or any affiliated party.<br>' +
    'Access to the API is contingent upon your complete compliance with these terms; any violation may result in the immediate termination of access and the initiation of all available legal remedies.<br>' +
    'By proceeding, you confirm that you fully understand and agree to these terms.<br><br>' +
    'You are allowed to use the API for personal projects or non-commercial purposes, provided that you do not exceed the rate limits and do not violate any other terms of use.<br>',
  tagIndex: 1,
  productionEnv: 'production',
  snakeCase: true,
  debug: false,
  ignore: ['/swagger', '/docs', '/'],
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
    parameters: {
      pagination: [
        {
          name: 'page',
          in: 'query',
          description: 'Page number',
          required: false,
          minimum: 1,
          maximum: 10,
          schema: { type: 'integer', default: 1 },
        },
        {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          required: false,
          minimum: 1,
          maximum: 50,
          schema: { type: 'integer', default: 10 },
        },
      ],
    },
  },
}
