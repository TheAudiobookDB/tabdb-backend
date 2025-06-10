// import type { HttpContext } from '@adonisjs/core/http'

import Book from '#models/book'
import { HttpContext } from '@adonisjs/core/http'
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@foadonis/openapi/decorators'
import {
  forbiddenApiResponse,
  jsonHeaderApi,
  tooManyRequestsApiResponse,
  validationErrorApiResponse,
} from '#config/openapi'
import { confirmValidation, createUpdateContributorValidation } from '#validators/crud_validator'
import Contributor from '#models/contributor'
import Publisher from '#models/publisher'
import Genre from '#models/genre'
import Series from '#models/series'

@ApiTags('Confirm')
@validationErrorApiResponse()
@tooManyRequestsApiResponse()
@jsonHeaderApi()
export default class ConfirmsController {
  @ApiOperation({
    summary: 'Confirm item',
    description:
      'This endpoint enables and confirms an item that might be a potential duplicate. Note that books require manual enabling, while all other items must be validated and deleted.',
    operationId: 'confirmItem',
  })
  @forbiddenApiResponse()
  @ApiBody({ type: () => createUpdateContributorValidation })
  @ApiParam({
    name: 'model',
    description: 'The type of model to confirm (book, contributor, series, genre, publisher)',
    required: true,
    schema: {
      type: 'string',
      enum: ['book', 'contributor', 'series', 'genre', 'publisher', 'group'],
    },
  })
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

    if (model === 'series') {
      const series = await Series.query().where('publicId', payload.id).firstOrFail()
      if (series.enabled) {
        return { message: 'Series already enabled' }
      }
      series.enabled = true
      await series.save()

      return { message: 'Series created successfully', series }
    }

    if (model === 'genre') {
      const genre = await Genre.query().where('publicId', payload.id).firstOrFail()
      if (genre.enabled) {
        return { message: 'Genre already enabled' }
      }
      genre.enabled = true
      await genre.save()

      return { message: 'Genre created successfully', genre }
    }

    if (model === 'publisher') {
      const publisher = await Publisher.query().where('publicId', payload.id).firstOrFail()
      if (publisher.enabled) {
        return { message: 'Publisher already enabled' }
      }
      publisher.enabled = true
      await publisher.save()

      return { message: 'Publisher created successfully', publisher }
    }

    console.log(model)

    return { message: 'Invalid model type' }
  }
}
