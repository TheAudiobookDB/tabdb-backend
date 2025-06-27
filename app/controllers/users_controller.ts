// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import User from '#models/user'
import { LogState } from '../enum/log_enum.js'
import Log from '#models/log'
import { updateUserValidator } from '#validators/user_validator'
import { FileHelper } from '../helpers/file_helper.js'
import { UserBaseDto, UserFullDto, UserPublicDto } from '#dtos/user'
import { LogBaseDto } from '#dtos/log'
import { ApiBody, ApiOperation, ApiTags } from '@foadonis/openapi/decorators'
import {
  nanoIdApiPathParameter,
  notFoundApiResponse,
  successApiResponse,
  tooManyRequestsApiResponse,
  unauthorizedApiResponse,
  validationErrorApiResponse,
} from '#config/openapi'

@ApiTags('User')
@validationErrorApiResponse()
@tooManyRequestsApiResponse()
export default class UsersController {
  @ApiOperation({
    summary: 'Get the authenticated user',
    operationId: 'getMe',
  })
  @notFoundApiResponse()
  @unauthorizedApiResponse()
  @successApiResponse({ type: UserBaseDto, status: 200 })
  async getMe({ auth }: HttpContext) {
    return new UserBaseDto(await auth.authenticate())
  }

  @ApiOperation({
    summary: 'Get the a User by ID',
    operationId: 'getUser',
  })
  @notFoundApiResponse()
  @unauthorizedApiResponse()
  @nanoIdApiPathParameter()
  @successApiResponse({ type: UserPublicDto, status: 200 })
  async get({ params }: HttpContext) {
    const payload = await getIdValidator.validate(params)
    return new UserPublicDto(await User.query().where('publicId', payload.id).firstOrFail())
  }

  @ApiOperation({
    summary: 'Get the a User edit history by ID',
    operationId: 'getUserHistory',
    deprecated: true,
  })
  @notFoundApiResponse()
  @unauthorizedApiResponse()
  @nanoIdApiPathParameter()
  @successApiResponse({ type: UserPublicDto, status: 200 })
  async editHistory({ params, auth }: HttpContext) {
    const payload = await getIdPaginationValidator.validate(params)

    const authUser = auth.user
    if (!authUser) {
      throw new Error('Unauthorized')
    }
    const abilities = authUser.currentAccessToken.abilities
    const privileged = abilities.includes('role:moderator') || abilities.includes('role:admin')

    const fetchUser = await User.query().where('publicId', payload.id).firstOrFail()

    return LogBaseDto.fromPaginator(
      await Log.query()
        .where('userId', fetchUser.id)
        .where((q) => {
          if (!privileged) q.where('state', LogState.APPROVED)
        })
        .paginate(payload.page, payload.limit)
    )
  }

  @ApiOperation({
    summary: 'Update the authenticated user',
    operationId: 'updateUser',
  })
  @notFoundApiResponse()
  @unauthorizedApiResponse()
  @ApiBody({ type: () => updateUserValidator })
  @successApiResponse({ type: UserPublicDto, status: 200 })
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
      user.avatar =
        (await FileHelper.uploadFromTemp(
          payload.avatar,
          'users',
          user.publicId,
          true,
          user.avatar
        )) || user.avatar
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

    return new UserFullDto(user)
  }
}
