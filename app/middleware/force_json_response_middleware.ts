import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Updating the "Accept" header to always accept "application/json" response
 * from the server. This will force the internals of the framework like
 * validator errors or auth errors to return a JSON response.
 */
export default class ForceJsonResponseMiddleware {
  async handle({ request }: HttpContext, next: NextFn) {
    const headers = request.headers()
    if (request.url(false) !== '/api') {
      headers.accept = 'application/json'
    } else {
      if (request.header('Referer', null) !== null) {
        headers.accept = 'application/json'
      }
    }

    return next()
  }
}
