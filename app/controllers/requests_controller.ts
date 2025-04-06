import { HttpContext } from '@adonisjs/core/http'
import { indexRequestValidator } from '#validators/request_validator'
import { Audible } from '../provider/audible.js'

export default class RequestsController {
  /**
   * @index
   * @operationId request
   * @summary Requests a new Model depending on the provider
   * @description The following providers and types are supported:\n- Audible: book, author, tracks, series
   *
   * @requestBody - <indexRequestValidator>
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async index({ request }: HttpContext) {
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
            const result = await Audible.fetchBook(payload.identifier, payload.language)
            return {
              message: `Request for book ${payload.identifier} from provider ${payload.provider} successfull`,
              id: result.publicId,
            }
          case 'author':
            return {
              message: `Request for author ${payload.identifier} from provider ${payload.provider}`,
            }
          case 'tracks':
            return {
              message: `Request for tracks ${payload.identifier} from provider ${payload.provider}`,
            }
          case 'series':
            return {
              message: `Request for series ${payload.identifier} from provider ${payload.provider}`,
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
