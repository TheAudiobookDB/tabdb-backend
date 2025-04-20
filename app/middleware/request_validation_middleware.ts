import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import InvalidUserAgentException from '#exceptions/invalid_user_agent_exception'

export default class RequestValidationMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const userAgent = ctx.request.header('user-agent')

    if (!userAgent || userAgent.length === 0) {
      throw new InvalidUserAgentException()
    }

    return await next()
  }
}
