// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import Contributor from '#models/contributor'
import Book from '#models/book'
import { BookDto } from '#dtos/book'
import { ContributorBaseDto, ContributorFullDto, ContributorMinimalDto } from '#dtos/contributor'
import { FileHelper } from '../helpers/file_helper.js'
import { DateTime } from 'luxon'
import { LogState } from '../enum/log_enum.js'
import { ModelHelper } from '../helpers/model_helper.js'
import { contributorIndex } from '#config/meilisearch'
import router from '@adonisjs/core/services/router'
import { nanoid } from '#config/app'
import db from '@adonisjs/lucid/services/db'
import { getIdsValidator } from '#validators/common_validator'
import { ApiBody, ApiOperation, ApiTags } from '@foadonis/openapi/decorators'
import {
  createdApiResponse,
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
import { createUpdateContributorValidation } from '#validators/crud_validator'

@ApiTags('Contributor')
@validationErrorApiResponse()
@tooManyRequestsApiResponse()
export default class NarratorsController {
  @ApiOperation({
    summary: 'Get a Contributor by ID',
    operationId: 'getContributor',
  })
  @nanoIdApiPathParameter()
  @notFoundApiResponse()
  @successApiResponse({ type: ContributorFullDto, status: 200 })
  async get({ params }: HttpContext) {
    const payload = await getIdValidator.validate(params)
    return new ContributorFullDto(
      await Contributor.query().where('publicId', payload.id).preload('identifiers').firstOrFail()
    )
  }

  @ApiOperation({
    summary: 'Get books by contributor ID',
    operationId: 'getBooksByContributor',
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
        .preload('contributors', (q) => q.pivotColumns(['role', 'type']))
        .preload('series')
        .preload('identifiers')
        .preload('genres')
        .preload('tracks')
        .preload('publisher')
        .whereHas('contributors', (q) => {
          q.where('public_id', payload.id)
        })
        .paginate(payload.page, payload.limit)
    )
  }

  @ApiOperation({
    summary: 'Get multiple Contributors by IDs',
    description:
      'Gets multiple contributors by IDs. This only returns minified versions. If you want the full version, use the `get` endpoint.',
    operationId: 'getContributors',
  })
  @nanoIdsApiQuery()
  @notFoundApiResponse()
  @successApiResponse({ type: [ContributorBaseDto], status: 200 })
  async getMultiple({ request }: HttpContext) {
    const payload = await getIdsValidator.validate(request.qs())

    const contributors: Contributor[] = await Contributor.query()
      .whereIn('public_id', payload.ids)
      .preload('identifiers')

    if (!contributors || contributors.length === 0) throw new NotFoundException()

    return ContributorBaseDto.fromArray(contributors)
  }

  @ApiOperation({
    summary: 'Create a new Contributor',
    description: 'Creates a new contributor. This will also upload the image if provided.',
    operationId: 'createContributor',
  })
  @forbiddenApiResponse()
  @ApiBody({ type: () => createUpdateContributorValidation })
  @createdApiResponse('ContributorFullDto', 'ContributorMinimalDto')
  async create({ request }: HttpContext) {
    const payload = await createUpdateContributorValidation.validate(request.body())

    const trx = await db.transaction()

    try {
      const existingContributor = await contributorIndex.search(payload.name, {
        limit: 3,
        attributesToRetrieve: ['id'],
        rankingScoreThreshold: 0.95,
      })
      const ids = existingContributor.hits.map((contributor) => contributor.id)
      const potentialContributors = await Contributor.query()
        .whereILike('name', payload.name!)
        .orWhereIn('id', ids)

      let possibleDuplicate = false
      if (existingContributor.hits.length > 0) {
        possibleDuplicate = true
      }
      if (potentialContributors && potentialContributors.length) {
        possibleDuplicate = true
      }

      const contributor = new Contributor()
      contributor.publicId = nanoid()
      contributor.name = payload.name!

      contributor.birthDate = payload.birthDate ? DateTime.fromJSDate(payload.birthDate) : null
      contributor.country = payload.country || null
      contributor.description = payload.description || null
      contributor.website = payload.website || null
      contributor.enabled = !possibleDuplicate

      contributor.useTransaction(trx)
      await contributor.saveWithLog(
        possibleDuplicate ? LogState.PENDING_DUPLICATE : LogState.PENDING,
        payload
      )

      // To only upload the image if the contributor could be created
      console.log(payload.image)
      if (payload.image) {
        const fileName = await FileHelper.saveFile(
          payload.image,
          'contributors',
          contributor.publicId,
          true
        )
        console.log(fileName)
        if (fileName) {
          contributor.image = fileName
          contributor.useTransaction(trx)
          await contributor.save()
        }
      }

      if (payload.identifiers) {
        await ModelHelper.addIdentifier(contributor, payload.identifiers, trx)
      }

      await trx.commit()

      return {
        message: possibleDuplicate
          ? 'Contributor created with pending duplicate. Please'
          : 'Contributor created',
        data: new ContributorFullDto(contributor),
        ...(possibleDuplicate
          ? {
              activationLink: router
                .builder()
                .qs({ id: contributor.publicId })
                .disableRouteLookup()
                .makeSigned(`/confirm/contributor`, {
                  expiresIn: '7d',
                  purpose: 'confirm-contributor',
                }),
              duplicates: ContributorMinimalDto.fromArray(potentialContributors),
            }
          : {}),
      }
    } catch (e) {
      await trx.rollback()

      throw e
    }
  }
}
