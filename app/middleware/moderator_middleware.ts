import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import { UserAbilities } from '../enum/user_enum.js'

/**
 * Auth middleware is used authenticate HTTP requests and deny
 * access to unauthenticated users.
 */
export default class ModeratorAuthMiddleware {
  /**
   * The URL to redirect to, when authentication fails
   */
  redirectTo = '/login'

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    await ctx.auth.authenticateUsing(options.guards, { loginRoute: this.redirectTo })

    const abilities = new UserAbilities(ctx.auth.user!.currentAccessToken.abilities)

    if (!abilities.hasAbility('moderator')) {
      ctx.response.status(403)
      return ctx.response.send({
        message: 'You do not have permission to perform this action',
      })
    }

    return next()
  }
}
