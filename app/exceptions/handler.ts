import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { errors } from '@adonisjs/auth'
import { errors as lucidErrors } from '@adonisjs/lucid'
import { Exception as AdonisException } from '@adonisjs/core/exceptions'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof errors.E_INVALID_CREDENTIALS) {
      return ctx.response.status(error.status).send(error.getResponseMessage(error, ctx))
    }
    if (error instanceof lucidErrors.E_ROW_NOT_FOUND) {
      return ctx.response.status(error.status).send({
        message: 'Not Found',
        requestId: ctx.request.id(),
      })
    }
    if (error instanceof AdonisException) {
      return ctx.response.status(error.status).send({
        message: error.message,
        requestId: ctx.request.id(),
      })
    }

    return super.handle(error, ctx)
  }

  buildRequestData = (ctx: HttpContext, status: number) => {
    const filterHeaders = () =>
      JSON.stringify(
        Object.entries(ctx.request.headers() || {}).filter(
          ([key]) => !['user-agent', 'authorization', 'x-request-id'].includes(key.toLowerCase())
        )
      )

    const getRequestBody = () => {
      try {
        const body = ctx.request.body()
        if (body && typeof body === 'object') {
          for (const key of Object.keys(body)) {
            if (key.toLowerCase().includes('image')) {
              body[key] = null
            }
          }
        }
        const jsonString = JSON.stringify(body)
        return jsonString.length > 2 && jsonString.length < 10 * 1024 ? jsonString : null
      } catch {
        const body = ctx.request.body()
        if (body && typeof body === 'object') {
          for (const key of Object.keys(body)) {
            if (key.toLowerCase().includes('image')) {
              body[key] = null
            }
          }
        }
        const jsonString = JSON.stringify(body)
        return jsonString.length > 2 && jsonString.length < 10 * 1024 ? jsonString : null
      }
    }

    return {
      method: ctx.request.method(),
      url: ctx.request.url(false),
      query: Object.keys(ctx.request.qs()).length > 0 ? JSON.stringify(ctx.request.qs()) : null,
      headers: status >= 500 ? filterHeaders() : null,
      userAgent: ctx.request.header('user-agent'),
      body: status >= 500 ? getRequestBody() : null,
      request_id: ctx.request.id(),
      params: ctx.request.params(),
      ip:
        ctx.request.header('CF-Connecting-IP') ||
        ctx.request.header('x-real-ip') ||
        ctx.request.ip(),
    }
  }

  /**
   * The method is used to report error to the logging service or
   * the third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    // @ts-ignore
    const status = 'status' in error ? (error.status as number) : undefined

    if (status === undefined || status >= 400) {
      const logLevel = status === undefined || status >= 500 ? 'error' : 'warn'
      ctx.logger[logLevel]({
        err: {
          // @ts-ignore
          code: error.code,
          // @ts-ignore
          message: error.message,
          // @ts-ignore
          name: error.name,
        },
        status: status,
        request: this.buildRequestData(ctx, status ?? 500),
      })
    }
    return super.report(error, ctx)
  }
}
