// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import Contributor from '#models/contributor'
import Book from '#models/book'
import { BookDto } from '#dtos/book'
import { ContributorBaseDto, ContributorFullDto } from '#dtos/contributor'
import { FileHelper } from '../helpers/file_helper.js'
import { DateTime } from 'luxon'
import { LogState } from '../enum/log_enum.js'
import { ModelHelper } from '../helpers/model_helper.js'
import { contributorIndex } from '#config/meilisearch'
import router from '@adonisjs/core/services/router'
import { nanoid } from '#config/app'
import {
  contributorCreateValidator,
  contributorUpdateValidator,
} from '#validators/create_validator'
import db from '@adonisjs/lucid/services/db'
import { UserAbilities } from '../enum/user_enum.js'
import { getIdsValidator } from '#validators/common_validator'
import { ApiOperation, ApiTags } from '@foadonis/openapi/decorators'
import {
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
  @successApiResponse({ type: [BookDtoPaginated], status: 200 })
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

  /**
   * @create
   * @operationId createContributor
   * @summary Create a new contributor
   * @description Create a new contributor
   *
   * @requestBody - <contributorCreateValidator>
   *
   * @responseHeader 201 - @use(rate)
   * @responseHeader 201 - @use(requestId)
   *
   * @responseBody 201 - <Contributor>.with(relations).exclude(books)
   */
  async create({ request }: HttpContext) {
    const payload = await contributorCreateValidator.validate(request.body())

    const trx = await db.transaction()

    try {
      const existingContributor = await contributorIndex.search(payload.name, {
        limit: 1,
        attributesToRetrieve: ['id'],
        rankingScoreThreshold: 0.95,
      })
      const exactContributor = await Contributor.query().whereILike('name', payload.name!).first()

      let possibleDuplicate = false
      if (existingContributor.hits.length > 0) {
        possibleDuplicate = true
      }
      if (exactContributor) {
        possibleDuplicate = true
      }

      const contributor = new Contributor()
      contributor.publicId = nanoid()
      contributor.name = payload.name!

      contributor.birthDate = payload.birthdate ? DateTime.fromJSDate(payload.birthdate) : null
      contributor.country = payload.country || null
      contributor.description = payload.description || null
      contributor.website = payload.website || null

      contributor.useTransaction(trx)
      await contributor.saveWithLog(
        possibleDuplicate ? LogState.PENDING_DUPLICATE : LogState.PENDING,
        trx
      )

      // To only upload the image if the contributor could be created
      if (payload.image) {
        const fileName = await FileHelper.saveFile(
          payload.image,
          'contributors',
          contributor.publicId,
          true
        )
        if (fileName) {
          contributor.image = fileName
          contributor.useTransaction(trx)
          await contributor.save()
        }
      }

      if (contributor.identifiers) {
        await ModelHelper.addIdentifier(contributor, payload.identifiers, trx)
      }

      await trx.commit()

      return {
        message: possibleDuplicate
          ? 'Contributor created with pending duplicate'
          : 'Contributor created',
        data: new ContributorFullDto(contributor),
        ...(possibleDuplicate
          ? {
              activationLink: router
                .builder()
                .params({ id: contributor.publicId })
                .disableRouteLookup()
                .make('/confirm/contributor/:id'),
            }
          : {}),
      }
    } catch (e) {
      await trx.rollback()

      throw e
    }
  }

  /**
   * @update
   * @operationId updateContributor
   * @summary Update a contributor
   * @description Update a contributor
   *
   * @requestBody - <contributorValidator>
   *
   * @responseHeader 201 - @use(rate)
   * @responseHeader 201 - @use(requestId)
   *
   * @responseBody 201 - <Contributor>.with(relations).exclude(books)
   */
  async update({ request, auth }: HttpContext) {
    const payload = await contributorUpdateValidator.validate(request.body())

    const contributor = await Contributor.findByOrFail('publicId', payload.id)

    const trx = await db.transaction()
    const logTrx = await db.transaction()

    const userPermissions = new UserAbilities(undefined, auth.user)
    const instantUpdate = userPermissions.hasAbility('server:update')

    try {
      contributor.name = payload.name ?? contributor.name

      contributor.birthDate = payload.birthdate
        ? DateTime.fromJSDate(payload.birthdate)
        : contributor.birthDate
      contributor.country = payload.country ?? contributor.country
      contributor.description = payload.description ?? contributor.description
      contributor.website = payload.website ?? contributor.website
      contributor.useTransaction(trx)

      if (payload.image) {
        const fileName = await FileHelper.saveFile(
          payload.image,
          'contributors',
          contributor.publicId,
          true,
          contributor.image
        )
        if (fileName) {
          contributor.image = fileName
          contributor.useTransaction(trx)
          await contributor.save()
        }
      }

      if (payload.identifiers) {
        await ModelHelper.addIdentifier(contributor, payload.identifiers, trx, true)
      }

      await contributor.saveWithLog(
        instantUpdate ? LogState.APPROVED : LogState.PENDING,
        logTrx,
        false
      )

      if (instantUpdate) {
        await trx.commit()
      } else {
        await trx.rollback()
      }
      await logTrx.commit()

      return {
        message: instantUpdate ? 'Contributor updated' : 'Contributor updated with pending',
        data: new ContributorFullDto(contributor),
      }
    } catch (e) {
      await trx.rollback()
      await logTrx.rollback()
      throw e
    }
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
}
