import { HttpContext } from '@adonisjs/core/http'
import { indexRequestValidator } from '#validators/request_validator'
import { Audible } from '../provider/audible.js'
import { ApiBody, ApiOperation, ApiTags } from '@foadonis/openapi/decorators'
import {
  jsonHeaderApi,
  successApiResponse,
  tooManyRequestsApiResponse,
  validationErrorApiResponse,
} from '#config/openapi'

@validationErrorApiResponse()
@tooManyRequestsApiResponse()
@ApiTags('Request')
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
}
