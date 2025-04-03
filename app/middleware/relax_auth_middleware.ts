import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * RelaxAuthMiddleware attempts to authenticate the user using the specified guards.
 * If authentication is successful, `ctx.auth.user` will be populated.
 * If authentication fails or no credentials are provided, the middleware
 * proceeds without throwing an error, leaving `ctx.auth.user` as null.
 */
export default class RelaxAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Attempt to authenticate the user using the specified guards (or the default one).
     * check() returns true if authenticated, false otherwise.
     */
    await ctx.auth.check()

    // Always proceed to the next middleware or route handler
    return next()
  }
}
