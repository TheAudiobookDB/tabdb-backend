// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import Publisher from '#models/publisher'
import Book from '#models/book'
import { PublisherBaseDto, PublisherFullDto, PublisherMinimalDto } from '#dtos/publisher'
import { BookDto } from '#dtos/book'
import { getIdsValidator } from '#validators/common_validator'
import { ApiBody, ApiOperation, ApiTags } from '@foadonis/openapi/decorators'
import {
  createdApiResponse,
  duplicateApiResponse,
  forbiddenApiResponse,
  limitApiQuery,
  nanoIdApiPathParameter,
  nanoIdsApiQuery,
  notFoundApiResponse,
  pageApiQuery,
  successApiResponse,
  tooManyRequestsApiResponse,
  validationErrorApiResponse,
} from '#config/openapi'
import { BookDtoPaginated } from '#dtos/pagination'
import NotFoundException from '#exceptions/not_found_exception'
import db from '@adonisjs/lucid/services/db'
import { publisherIndex } from '#config/meilisearch'
import { nanoid } from '#config/app'
import { LogState } from '../enum/log_enum.js'
import router from '@adonisjs/core/services/router'
import { createPublisherValidation } from '#validators/crud_validator'
import ForbiddenException from '#exceptions/forbidden_exception'
import { UserAbilities } from '../enum/user_enum.js'
import { DateTime } from 'luxon'

@ApiTags('Publisher')
@validationErrorApiResponse()
@tooManyRequestsApiResponse()
export default class PublishersController {
  @ApiOperation({
    summary: 'Get a Publisher by ID',
    operationId: 'getPublisher',
  })
  @nanoIdApiPathParameter()
  @notFoundApiResponse()
  @successApiResponse({ type: PublisherFullDto, status: 200 })
  async get({ params }: HttpContext) {
    const payload = await getIdValidator.validate(params)
    return new PublisherFullDto(
      await Publisher.query().where('publicId', payload.id).whereNull('deleted_at').firstOrFail()
    )
  }

  @ApiOperation({
    summary: 'Get books for publisher ID',
    operationId: 'getBooksForPublisher',
    tags: ['Book'],
  })
  @pageApiQuery()
  @limitApiQuery()
  @nanoIdApiPathParameter()
  @notFoundApiResponse()
  @successApiResponse({ type: BookDtoPaginated, status: 200 })
  async books({ params }: HttpContext) {
    const payload = await getIdPaginationValidator.validate(params)
    return BookDto.fromPaginator(
      await Book.query()
        .whereNull('deleted_at')
        .preload('contributors', (q) => q.pivotColumns(['role', 'type']).whereNull('deleted_at'))
        .preload('series', (q) => q.whereNull('deleted_at'))
        .preload('identifiers', (q) => q.whereNull('deleted_at'))
        .preload('genres', (q) => q.whereNull('deleted_at'))
        .preload('tracks', (q) => q.whereNull('deleted_at'))
        .preload('publisher', (q) => q.whereNull('deleted_at'))
        .whereHas('publisher', (q) => {
          q.where('public_id', payload.id).whereNull('deleted_at')
        })
        .paginate(payload.page, payload.limit)
    )
  }

  @ApiOperation({
    summary: 'Get multiple Publisher by IDs',
    description:
      'Gets multiple publishers by IDs. This only returns minified versions. If you want the full version, use the `get` endpoint.',
    operationId: 'getPublishers',
    tags: ['Publisher'],
  })
  @nanoIdsApiQuery()
  @notFoundApiResponse()
  @successApiResponse({ type: [PublisherBaseDto], status: 200 })
  async getMultiple({ request }: HttpContext) {
    const payload = await getIdsValidator.validate(request.qs())

    const publishers: Publisher[] = await Publisher.query()
      .whereIn('public_id', payload.ids)
      .whereNull('deleted_at')

    if (!publishers || publishers.length === 0) throw new NotFoundException()

    return PublisherBaseDto.fromArray(publishers)
  }

  @ApiOperation({
    summary: 'Create a new Publisher',
    description: 'Creates a new publisher.',
    operationId: 'createPublisher',
  })
  @forbiddenApiResponse()
  @ApiBody({ type: () => createPublisherValidation })
  @duplicateApiResponse('PublisherMinimalDto')
  @createdApiResponse('PublisherFullDto', 'PublisherMinimalDto')
  async create({ request, response }: HttpContext) {
    const payload = await createPublisherValidation.validate(request.body())

    const trx = await db.transaction()

    try {
      const existingPublisher = await publisherIndex.search(payload.name, {
        limit: 3,
        attributesToRetrieve: ['id'],
        rankingScoreThreshold: 0.95,
      })
      const ids = existingPublisher.hits.map((publisher) => publisher.id)
      const potentialPublishers = await Publisher.query()
        .whereILike('name', payload.name!)
        .orWhereIn('id', ids)

      const duplicatePublisher = potentialPublishers.find((publisher) => {
        return publisher.name.toLowerCase() === payload.name!.toLowerCase()
      })

      if (duplicatePublisher) {
        return response.status(409).send({
          message: 'Publisher already exists',
          requestId: request.id(),
          data: new PublisherBaseDto(duplicatePublisher),
        })
      }

      let possibleDuplicate = false
      if (existingPublisher.hits.length > 0) {
        possibleDuplicate = true
      }
      if (potentialPublishers && potentialPublishers.length) {
        possibleDuplicate = true
      }

      const publisher = new Publisher()
      publisher.publicId = nanoid()
      publisher.name = payload.name
      publisher.description = payload.description || null
      publisher.enabled = !possibleDuplicate

      publisher.useTransaction(trx)
      await publisher.saveWithLog(
        possibleDuplicate ? LogState.PENDING_DUPLICATE : LogState.PENDING,
        payload
      )

      await trx.commit()

      return {
        message: possibleDuplicate
          ? 'Publisher created with pending duplicate. Please'
          : 'Publisher created',
        data: new PublisherFullDto(publisher),
        ...(possibleDuplicate
          ? {
              activationLink: router
                .builder()
                .qs({ id: publisher.publicId })
                .disableRouteLookup()
                .makeSigned(`/confirm/publisher`, {
                  expiresIn: '7d',
                  purpose: 'confirm-publisher',
                }),
              duplicates: PublisherMinimalDto.fromArray(potentialPublishers),
            }
          : {}),
      }
    } catch (e) {
      await trx.rollback()

      throw e
    }
  }

  @ApiOperation({
    summary: 'Delete a Publisher by ID',
    description:
      'Soft deletes a publisher by setting its deletedAt timestamp. This will also remove it from search indices.',
    operationId: 'deletePublisher',
  })
  @nanoIdApiPathParameter()
  @forbiddenApiResponse()
  @notFoundApiResponse()
  @successApiResponse({ status: 204 })
  async delete({ params, auth }: HttpContext) {
    const payload = await getIdValidator.validate(params)

    const abilities = new UserAbilities(undefined, auth.user)

    if (!abilities.hasAbility('item:delete')) {
      throw new ForbiddenException('You do not have permission to delete publishers.')
    }

    const publisher: Publisher = await Publisher.query()
      .where('public_id', payload.id)
      .whereNull('deleted_at')
      .firstOrFail()

    publisher.deletedAt = DateTime.now()
    await publisher.save()

    void publisherIndex.deleteDocument(publisher.id)

    return { message: 'Publisher deleted successfully' }
  }
}
