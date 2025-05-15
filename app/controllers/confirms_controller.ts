// import type { HttpContext } from '@adonisjs/core/http'

import Book from '#models/book'
import { HttpContext } from '@adonisjs/core/http'
import { ApiBody, ApiOperation, ApiTags } from '@foadonis/openapi/decorators'
import {
  forbiddenApiResponse,
  tooManyRequestsApiResponse,
  validationErrorApiResponse,
} from '#config/openapi'
import { confirmValidation, createUpdateContributorValidation } from '#validators/crud_validator'
import Contributor from '#models/contributor'

@ApiTags('Confirm')
@validationErrorApiResponse()
@tooManyRequestsApiResponse()
export default class ConfirmsController {
  @ApiOperation({
    summary: 'Confirm item',
    description:
      'This endpoint enables and confirms an item that might be a potential duplicate. Note that books require manual enabling, while all other items must be validated and deleted.',
    operationId: 'confirmItem',
  })
  @forbiddenApiResponse()
  @ApiBody({ type: () => createUpdateContributorValidation })
  async create({ request }: HttpContext) {
    const payload = await confirmValidation.validate(request.qs())
    const { model } = request.params()

    if (request.hasValidSignature()) {
      return { message: 'Invalid signature' }
    }

    if (model === 'book') {
      const book = await Book.query().where('publicId', payload.id).firstOrFail()
      if (book.enabled) {
        return { message: 'Book already enabled' }
      }
      await Book.enableBookAndRelations(book.id)

      return { message: 'Book created successfully', book }
    }

    if (model === 'contributor') {
      const contributor = await Contributor.query().where('publicId', payload.id).firstOrFail()
      if (contributor.enabled) {
        return { message: 'Contributor already enabled' }
      }
      contributor.enabled = true
      await contributor.save()

      return { message: 'Contributor created successfully', contributor }
    }

    console.log(model)

    return { message: 'Invalid model type' }
  }
}
