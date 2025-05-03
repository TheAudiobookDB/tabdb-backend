// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import {
  getIdPaginationValidator,
  getIdValidator,
  paginationValidator,
} from '#validators/provider_validator'
import Contributor from '#models/contributor'
import Book from '#models/book'
import { BookDto } from '#dtos/book'
import { ContributorFullDto } from '#dtos/contributor'
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
import { inject } from '@adonisjs/core'
import VisitTrackingService from '#services/visit_tracking_service'

export default class NarratorsController {
  /**
   * @get
   * @operationId getContributor
   * @summary Get a contributor by ID
   *
   * @requestBody - <getIdValidator>
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Contributor>.with(relations).exclude(books)
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  @inject()
  async get({ params }: HttpContext, service: VisitTrackingService) {
    const payload = await getIdValidator.validate(params)

    const contributor = await Contributor.query()
      .where('publicId', payload.id)
      .preload('identifiers')
      .firstOrFail()

    void service.recordVisit({
      type: 'contributor',
      id: contributor.publicId,
    })

    return new ContributorFullDto(contributor)
  }

  /**
   * @books
   * @operationId getBooksByContributor
   * @summary Get books by contributor ID
   *
   * @paramUse(pagination)
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Book[]>.with(relations).paginated()
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
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

  async getMultiple({ request }: HttpContext) {
    const payload = await getIdsValidator.validate(request.qs())

    const contributors: Contributor[] = await Contributor.query()
      .whereIn('public_id', payload.ids)
      .preload('identifiers')

    if (!contributors || contributors.length === 0) throw new Error('No data found')

    return ContributorFullDto.fromArray(contributors)
  }

  @inject()
  async popularByBooks() {
    const bookVisitsSubquery = db
      .from('books')
      .select('books.id as book_id')
      .select(db.raw('COALESCE(SUM(visits.visit_count), 0) as total_book_visits'))
      .leftJoin('visits', (join) => {
        join
          .on('books.public_id', '=', 'visits.trackable_id')
          .andOnVal('visits.trackable_type', '=', 'book')
      })
      .groupBy('books.id')

    const subqueryCompiled = bookVisitsSubquery.toSQL()

    const topContributorsQuery = Contributor.query()
      .select('contributors.id', 'contributors.public_id')
      .select(db.raw('AVG(??.??) as avg_visits_per_book', ['bv', 'total_book_visits']))
      .innerJoin('book_contributor', 'contributors.id', 'book_contributor.contributor_id')
      .joinRaw(`INNER JOIN (${subqueryCompiled.sql}) AS ?? ON ??.?? = ??.??`, [
        // @ts-ignore
        ...subqueryCompiled.bindings,
        // @ts-ignore
        'bv',
        // @ts-ignore
        'bv',
        // @ts-ignore
        'book_id',
        // @ts-ignore
        'book_contributor',
        // @ts-ignore
        'book_id',
      ])
      .groupBy('contributors.id', 'contributors.public_id')
      .orderBy('avg_visits_per_book', 'desc')
      .limit(10)

    const results = await topContributorsQuery

    return results
  }

  async popular({ params, request }: HttpContext) {
    const payload = await paginationValidator.validate({
      ...params,
      ...request.qs(),
    })

    const query = Contributor.query()
      .select('contributors.public_id', 'contributors.id')
      .select(db.raw('COALESCE(SUM(visits.visit_count), 0) as total_visit_count'))
      .leftJoin('visits', 'contributors.public_id', 'visits.trackable_id')
      .groupBy('contributors.id', 'contributors.public_id', 'visits.interval_start_date')
      .orderBy('total_visit_count', 'desc')

    return await query.paginate(payload.page, payload.limit)
  }
}
