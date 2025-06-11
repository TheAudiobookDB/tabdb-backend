import { HttpContext } from '@adonisjs/core/http'
import { indexRequestValidator } from '#validators/request_validator'
import { Audible } from '../provider/audible.js'
import { ApiBody, ApiHeader, ApiOperation, ApiTags } from '@foadonis/openapi/decorators'
import {
  jsonHeaderApi,
  successApiResponse,
  tooManyRequestsApiResponse,
  validationErrorApiResponse,
} from '#config/openapi'
import { addImageValidation } from '#validators/crud_validator'
import { nanoid } from '#config/app'
import app from '@adonisjs/core/services/app'
import ImageTemp from '#models/image_temp'

@validationErrorApiResponse()
@tooManyRequestsApiResponse()
export default class RequestsController {
  @ApiOperation({
    summary: 'Requests a new Model depending on the provider',
    description:
      '## Supported Providers and Types\n' +
      '\n' +
      '### Audible\n' +
      '\n' +
      '*   **Supported Types:** `book`, `author`, `tracks`, `series`\n' +
      '*   **Identifier:** `ASIN` (10 characters long)\n' +
      '*   **Required Data:** Region (`us`, `ca`, `uk`, `au`, `fr`, `de`, `jp`, `it`, `in`, `es`, `br`)\n',
    operationId: 'request',
  })
  @successApiResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Request message' },
        id: { type: 'string', description: 'The ID of the created or updated model' },
      },
    },
    status: 200,
  })
  @ApiBody({ type: () => indexRequestValidator })
  @jsonHeaderApi()
  @ApiTags('Request')
  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(indexRequestValidator)

    switch (payload.provider) {
      case 'audible':
        const supportedTypes = ['book', 'author', 'tracks', 'series']
        if (!supportedTypes.includes(payload.type)) {
          return {
            message: `Unsupported type for provider ${payload.provider}`,
          }
        }

        switch (payload.type) {
          case 'book':
            const result = await Audible.fetchBook(payload.identifier, payload.data)
            return {
              message: `Request for book ${payload.identifier} from provider ${payload.provider} successful`,
              id: result.publicId,
            }
          case 'author':
            const authorResult = await Audible.fetchAuthor(payload.identifier, payload.data)
            if (!authorResult) {
              return response.status(404).send({
                message: `No author found or an error occurred while fetching author ${payload.identifier} from provider ${payload.provider}. If you think this is`,
                requestId: request.id(),
              })
            }
            return {
              message: `Request for author ${payload.identifier} from provider ${payload.provider} successful`,
              id: authorResult.publicId,
            }
          case 'tracks':
            const trackBookResult = await Audible.fetchTracks(payload.identifier, payload.data)
            return {
              message: `Request for tracks ${payload.identifier} from provider ${payload.provider} successful`,
              id: trackBookResult.id,
            }
          case 'series':
            const seriesResult = await Audible.fetchSeries(payload.identifier, payload.data)
            return {
              message: `Request for series ${payload.identifier} from provider ${payload.provider} successful`,
              id: seriesResult.publicId,
            }
        }

        break
      default:
        return {
          message: `Unsupported provider ${payload.provider}`,
        }
    }
  }

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
  @ApiHeader({
    name: 'Content-Type',
    description: 'multipart/form-data',
    required: true,
    schema: { type: 'string', default: 'multipart/form-data' },
  })
  @ApiTags('Image')
  @ApiBody({ type: () => addImageValidation })
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
}
