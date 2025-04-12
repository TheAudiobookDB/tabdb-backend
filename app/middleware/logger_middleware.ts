import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import logger from '@adonisjs/core/services/logger'

/**
 * Logger middleware is used to log all the requests
 */
export default class LoggerMiddleware {
  async handle({ request }: HttpContext, next: NextFn) {
    const queryWhitelist = [
      'title',
      'author',
      'series',
      'narrator',
      'keywords',
      'page',
      'langauge',
      'threshold',
      'limit',
    ]

    void logger.debug({
      method: request.method(),
      url: request.url(),
      ip: request.ip(),
      headers: {
        'x-request-id': request.header('x-request-id'),
        'user-agent': request.header('user-agent'),
      },
      query: (() => {
        const ps = request.qs()
        const fp: Record<string, unknown> = {}
        for (let i = 0, len = queryWhitelist.length; i < len; i++) {
          const key = queryWhitelist[i]
          if (ps[key] !== undefined) {
            fp[key] = ps[key]
          }
        }
        return fp
      })(),
    })

    return next()
  }
}
