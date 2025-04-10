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
   * @responseBody 200 - <RequestResponse>
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
              message: `Request for book ${payload.identifier} from provider ${payload.provider} successful`,
              id: result.publicId,
            }
          case 'author':
            const authorResult = await Audible.fetchAuthor(payload.identifier, payload.language)
            return {
              message: `Request for author ${payload.identifier} from provider ${payload.provider} successful`,
              id: authorResult.publicId,
            }
          case 'tracks':
            const trackBookResult = await Audible.fetchTracks(payload.identifier, payload.language)
            return {
              message: `Request for tracks ${payload.identifier} from provider ${payload.provider} successful`,
              id: trackBookResult.id,
            }
          case 'series':
            const seriesResult = await Audible.fetchSeries(payload.identifier, payload.language)
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
