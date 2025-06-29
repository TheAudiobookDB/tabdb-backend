// import type { HttpContext } from '@adonisjs/core/http'

import { ApiBody, ApiOperation, ApiTags } from '@foadonis/openapi/decorators'
import {
  successApiResponse,
  tooManyRequestsApiResponse,
  validationErrorApiResponse,
  nanoIdApiPathParameter,
  forbiddenApiResponse,
  notFoundApiResponse,
} from '#config/openapi'
import { HttpContext } from '@adonisjs/core/http'
import { addImageValidation } from '#validators/crud_validator'
import ImageTemp from '#models/image_temp'
import { nanoid } from '#config/app'
import app from '@adonisjs/core/services/app'
import { getIdValidator } from '#validators/provider_validator'
import ForbiddenException from '#exceptions/forbidden_exception'
import { UserAbilities } from '../enum/user_enum.js'
import { DateTime } from 'luxon'
import Image from '#models/image'

@validationErrorApiResponse()
@tooManyRequestsApiResponse()
@ApiTags('Image')
export default class ImagesController {
  @ApiOperation({
    summary: 'Uploads an image',
    description:
      "Uploads an image to the server. The image can be used for various models like books, authors, etc.\n\nWill be deleted after around 15 minutes if not assigned to a model. Use this only if you plan to attach the image to a model right after uploading. You can't upload more than 5 not used images to prevent spam.",
    operationId: 'uploadImage',
  })
  @successApiResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The ID of the created image' },
      },
    },
    status: 200,
  })
  @ApiBody({
    mediaType: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload',
        },
      },
      required: ['image'],
    },
  })
  async uploadImage(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(addImageValidation)

    // TODO: deployment lower
    const imageLimit = 30
    const userId = ctx.auth.user!.id
    const ip =
      ctx.request.header('CF-Connecting-IP') || ctx.request.header('x-real-ip') || ctx.request.ip()

    const result = await ImageTemp.query()
      .where((builder) => {
        builder.where('userId', userId).orWhere('ip', ip)
      })
      .where('updatedAt', '>', new Date(Date.now() - 15 * 60 * 1000))
      .count('* as total')
      .first()

    const count = Number(result?.$extras.total || 0)

    if (count >= imageLimit) {
      return ctx.response.status(429).send({
        message: `You have reached the limit of ${imageLimit} temporary images. Please use them or wait until they are deleted.`,
      })
    }

    if (!payload.image || !payload.image.extname) {
      return ctx.response.status(422).send({
        message: 'Image is required',
        errors: [
          {
            fieldName: 'image',
            clientName: payload.image?.clientName || 'image',
            message: 'Image is required',
            provided: payload.image ? `${payload.image.type}/${payload.image.subtype}` : 'none',
            type: 'required',
          },
        ],
      })
    }

    const imageId = nanoid()

    const uploadPath = app.makePath('storage/uploads/temp')
    await payload.image.move(uploadPath, {
      name: `${imageId}.${payload.image.extname}`,
      overwrite: true,
    })

    const image: ImageTemp = new ImageTemp()
    image.ip =
      ctx.request.header('CF-Connecting-IP') || ctx.request.header('x-real-ip') || ctx.request.ip()
    image.publicId = imageId
    image.userId = ctx.auth.user!.id
    image.extension = payload.image.extname!

    await image.save()

    return {
      id: imageId,
      message: 'Image uploaded successfully',
    }
  }

  @ApiOperation({
    summary: 'Delete an Image by ID',
    description: 'Soft deletes an image by setting its deletedAt timestamp.',
    operationId: 'deleteImage',
  })
  @nanoIdApiPathParameter()
  @forbiddenApiResponse()
  @notFoundApiResponse()
  @successApiResponse({ status: 204 })
  async delete({ params, auth }: HttpContext) {
    const payload = await getIdValidator.validate(params)

    const abilities = new UserAbilities(undefined, auth.user)

    if (!abilities.hasAbility('item:delete')) {
      throw new ForbiddenException('You do not have permission to delete images.')
    }

    const image: Image = await Image.query()
      .where('public_id', payload.id)
      .whereNull('deleted_at')
      .firstOrFail()

    image.deletedAt = DateTime.now()
    await image.save()

    return { message: 'Image deleted successfully' }
  }
}
