// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import User from '#models/user'
import { LogState } from '../enum/log_enum.js'
import Log from '#models/log'
import { updateUserValidator } from '#validators/user_validator'
import { FileHelper } from '../helpers/file_helper.js'

export default class UsersController {
  /**
   * @getMe
   * @operationId getMe
   * @summary Get the authenticated user
   * @description This endpoint returns the authenticated user. It is used to get the user information after login.
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <User>
   * @responseBody 429 - <TooManyRequests>
   */
  async getMe({ auth }: HttpContext) {
    return await auth.authenticate()
  }

  /**
   * @get
   * @operationId getUser
   * @summary Get a user by ID
   *
   * @requestBody - <getIdValidator>
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <User>
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async get({ params }: HttpContext) {
    const payload = await getIdValidator.validate(params)
    return (await User.query().where('publicId', payload.id).firstOrFail()).serialize({
      fields: {
        pick: ['id', 'username', 'avatar', 'role'],
      },
    })
  }

  /**
   * @editHistory
   * @operationId getEditHistoryByUser
   * @summary Get edit history by user ID
   *
   * @paramUse(pagination)
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Log[]>.paginated()
   */
  async editHistory({ params, auth }: HttpContext) {
    const payload = await getIdPaginationValidator.validate(params)

    const authUser = auth.user
    if (!authUser) {
      throw new Error('Unauthorized')
    }
    const abilities = authUser.currentAccessToken.abilities
    const privileged = abilities.includes('role:moderator') || abilities.includes('role:admin')

    const fetchUser = await User.query().where('publicId', payload.id).firstOrFail()

    return Log.query()
      .where('userId', fetchUser.id)
      .where((q) => {
        if (!privileged) q.where('state', LogState.APPROVED)
      })
      .paginate(payload.page, payload.limit)
  }

  /**
   * @update
   * @operationId updateUser
   * @summary Update current user
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <User>
   */
  async update({ auth, request, response }: HttpContext) {
    const user = await auth.authenticate()
    if (user.updatedAt && user.updatedAt.diffNow().as('hours') >= -1) {
      return response.status(429).send({
        message: 'You can only update your profile once every 1 hour.',
      })
    }

    const payload = await request.validateUsing(updateUserValidator)

    if (payload.email) {
      user.email = payload.email
    }
    if (payload.fullName) {
      user.fullName = payload.fullName
    }
    if (payload.username) {
      user.username = payload.username
    }
    if (payload.avatar) {
      const filePath = await FileHelper.saveFile(
        payload.avatar,
        'users',
        user.publicId,
        true,
        user.avatar
      )
      if (filePath) {
        user.avatar = filePath
      } else {
        return response.status(422).send({
          message: 'File upload failed',
        })
      }
    }

    await user.save()

    return user.serialize({
      fields: {
        pick: ['id', 'username', 'avatar', 'role'],
      },
    })
  }
}
