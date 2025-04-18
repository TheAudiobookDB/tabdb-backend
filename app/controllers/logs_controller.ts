// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import Log from '#models/log'
import { LogState } from '../enum/log_enum.js'
import { getIdPaginationValidator } from '#validators/provider_validator'
import { LogFullDto } from '#dtos/log'

export default class LogsController {
  /**
   * @getEditHistory
   * @operationId getEditHistoryForModel
   * @summary Get edit history for a model by ID
   *
   * @paramUse(pagination)
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Log[]>.paginated()
   */
  async getEditHistory({ auth, params }: HttpContext) {
    const payload = await getIdPaginationValidator.validate(params)

    const authUser = auth.user
    if (!authUser) {
      throw new Error('Unauthorized')
    }
    const abilities = authUser.currentAccessToken.abilities
    const privileged = abilities.includes('role:moderator') || abilities.includes('role:admin')

    const log = await Log.query()
      .where('modelId', payload.id)
      .where((q) => {
        if (!privileged) q.where('state', LogState.APPROVED)
      })
      .preload('user', (q) => {
        q.select(['publicId', 'username', 'role'])
      })
      .paginate(payload.page, payload.limit)

    return LogFullDto.fromPaginator(log)
  }
}
