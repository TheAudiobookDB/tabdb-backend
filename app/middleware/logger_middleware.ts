import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Logger middleware is used to log all the requests
 */
export default class LoggerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const startTime = Date.now()

    return next().then(() => {
      void ctx.logger.debug({
        status: ctx.response.getStatus(),
        request_id: ctx.request.id(),
        request: {
          method: ctx.request.method(),
          url: ctx.request.url(false),
          query: JSON.stringify(ctx.request.qs()),
          userAgent: ctx.request.header('user-agent'),
          params: ctx.request.params(),
          duration: Date.now() - startTime,
          ip:
            ctx.request.header('CF-Connecting-IP') ||
            ctx.request.header('x-real-ip') ||
            ctx.request.ip(),
        },
      })
    })
  }
}
