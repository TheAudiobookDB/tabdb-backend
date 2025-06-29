import { HttpContext } from '@adonisjs/core/http'
import { ApiOperation, ApiTags } from '@foadonis/openapi/decorators'
import {
  forbiddenApiResponse,
  successApiResponse,
  tooManyRequestsApiResponse,
  validationErrorApiResponse,
} from '#config/openapi'
import ForbiddenException from '#exceptions/forbidden_exception'
import { UserAbilities } from '../enum/user_enum.js'
import { CascadingSoftDeleteHelper } from '../helpers/cascading_soft_delete_helper.js'
import Book from '#models/book'

@ApiTags('Admin')
@validationErrorApiResponse()
@tooManyRequestsApiResponse()
export default class AdminController {
  @ApiOperation({
    summary: 'Cleanup orphaned images',
    description:
      'Removes images that belong to deleted books or tracks. Only admins can perform this action.',
    operationId: 'cleanupOrphanedImages',
  })
  @forbiddenApiResponse()
  @successApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        deletedCount: { type: 'number' },
      },
    },
  })
  async cleanupOrphanedImages({ auth }: HttpContext) {
    const abilities = new UserAbilities(undefined, auth.user)

    if (!abilities.hasAbility('admin')) {
      throw new ForbiddenException('You do not have permission to perform cleanup operations.')
    }

    const deletedCount = await CascadingSoftDeleteHelper.deleteOrphanedImages()

    return {
      message: `Cleaned up ${deletedCount} orphaned images.`,
      deletedCount,
    }
  }

  @ApiOperation({
    summary: 'Cleanup unused entities',
    description:
      'Removes contributors, series, genres, and publishers that have no active relationships with books. Only admins can perform this action.',
    operationId: 'cleanupUnusedEntities',
  })
  @forbiddenApiResponse()
  @successApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        deletedCounts: {
          type: 'object',
          properties: {
            contributors: { type: 'number' },
            series: { type: 'number' },
            genres: { type: 'number' },
            publishers: { type: 'number' },
          },
        },
      },
    },
  })
  async cleanupUnusedEntities({ auth }: HttpContext) {
    const abilities = new UserAbilities(undefined, auth.user)

    if (!abilities.hasAbility('admin')) {
      throw new ForbiddenException('You do not have permission to perform cleanup operations.')
    }

    const deletedCounts = await CascadingSoftDeleteHelper.cleanupUnusedEntities()

    const totalDeleted =
      deletedCounts.contributors +
      deletedCounts.series +
      deletedCounts.genres +
      deletedCounts.publishers

    return {
      message: `Cleaned up ${totalDeleted} unused entities.`,
      deletedCounts,
    }
  }

  @ApiOperation({
    summary: 'Restore a soft deleted book',
    description:
      'Restores a soft deleted book and all its related entities. Only admins can perform this action.',
    operationId: 'restoreBook',
  })
  @forbiddenApiResponse()
  @successApiResponse({ status: 200 })
  async restoreBook({ params, auth }: HttpContext) {
    const abilities = new UserAbilities(undefined, auth.user)

    if (!abilities.hasAbility('admin')) {
      throw new ForbiddenException('You do not have permission to restore entities.')
    }

    const book = await Book.query()
      .where('public_id', params.id)
      .whereNotNull('deleted_at')
      .firstOrFail()

    await CascadingSoftDeleteHelper.restoreBook(book)

    return { message: 'Book and related entities restored successfully' }
  }
}
