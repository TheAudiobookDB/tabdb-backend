// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { getIdPaginationValidator, getIdValidator } from '#validators/provider_validator'
import Track from '#models/track'
import { TrackFullDto, TrackMinimalDto } from '#dtos/track'
import Book from '#models/book'
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
  forbiddenApiResponse,
} from '#config/openapi'
import { TrackFullDtoPaginated } from '#dtos/pagination'
import NotFoundException from '#exceptions/not_found_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import { UserAbilities } from '../enum/user_enum.js'
import { CascadingSoftDeleteHelper } from '../helpers/cascading_soft_delete_helper.js'

@ApiTags('Track')
@validationErrorApiResponse()
@tooManyRequestsApiResponse()
export default class TracksController {
  /**
   * @get
   * @operationId getTrack
   * @summary Get a track by ID
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Track>.exclude(book)
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  @ApiOperation({
    summary: 'Get a track by ID',
    operationId: 'getTrack',
  })
  @nanoIdApiPathParameter()
  @notFoundApiResponse()
  @successApiResponse({ type: TrackFullDto, status: 200 })
  async get({ params }: HttpContext) {
    const payload = await getIdValidator.validate(params)
    return new TrackFullDto(
      await Track.query().where('publicId', payload.id).whereNull('deleted_at').firstOrFail()
    )
  }

  /**
   * @getTracksForBook
   * @operationId getTracksForBook
   * @summary Get tracks for a book by ID
   *
   * @paramUse(pagination)
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - <Track[]>.exclude(book).paginated()
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  @ApiOperation({
    summary: 'Get tracks for a book by ID',
    operationId: 'getTracksForBook',
  })
  @pageApiQuery()
  @limitApiQuery(500)
  @nanoIdApiPathParameter()
  @notFoundApiResponse()
  @successApiResponse({ type: [TrackFullDtoPaginated], status: 200 })
  async getTracksForBook({ params }: HttpContext) {
    const payload = await getIdPaginationValidator.validate(params)

    const book = await Book.query()
      .where('publicId', payload.id)
      .whereNull('deleted_at')
      .firstOrFail()

    return TrackFullDto.fromPaginator(
      await Track.query()
        .where('bookId', book?.id)
        .whereNull('deleted_at')
        .preload('contributors', (q) =>
          q
            .withScopes((s) => s.minimal())
            .pivotColumns(['role'])
            .whereNull('deleted_at')
        )
        .preload('images', (q) => q.whereNull('deleted_at'))
        .orderBy('start')
        .paginate(payload.page, payload.limit)
    )
  }

  @ApiOperation({
    summary: 'Get multiple Tracks by IDs',
    description:
      'Gets multiple tracks by IDs. This only returns minified versions. If you want the full version, use the `get` endpoint.',
    operationId: 'getTracks',
  })
  @nanoIdsApiQuery()
  @notFoundApiResponse()
  @successApiResponse({ type: [TrackMinimalDto], status: 200 })
  async getMultiple({ request }: HttpContext) {
    const payload = await getIdsValidator.validate(request.qs())

    const tracks: Track[] = await Track.query().whereIn('public_id', payload.ids)

    if (!tracks || tracks.length === 0) throw new NotFoundException()

    return TrackMinimalDto.fromArray(tracks)
  }

  @ApiOperation({
    summary: 'Delete a Track by ID',
    description: 'Soft deletes a track by setting its deletedAt timestamp.',
    operationId: 'deleteTrack',
  })
  @nanoIdApiPathParameter()
  @forbiddenApiResponse()
  @notFoundApiResponse()
  @successApiResponse({ status: 204 })
  async delete({ params, auth }: HttpContext) {
    const payload = await getIdValidator.validate(params)

    const abilities = new UserAbilities(undefined, auth.user)

    if (!abilities.hasAbility('item:delete')) {
      throw new ForbiddenException('You do not have permission to delete tracks.')
    }

    const track: Track = await Track.query()
      .where('public_id', payload.id)
      .whereNull('deleted_at')
      .firstOrFail()

    await CascadingSoftDeleteHelper.deleteTrack(track)

    return { message: 'Track and related entities deleted successfully' }
  }
}
