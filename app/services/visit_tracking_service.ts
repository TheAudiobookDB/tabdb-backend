import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'
import { inject } from '@adonisjs/core'

// Define Item interface for clarity when passing multiple
interface TrackableItem {
  type: string
  id: string | number
}

@inject()
export default class VisitTrackingService {
  private redisPrefix = 'visits'

  private generateKey(type: string, id: string | number): string {
    return `${this.redisPrefix}:${type}:${id}`
  }

  /**
   * Increments visit count(s) for one or more items.
   */
  async recordVisit(itemOrItems: TrackableItem | TrackableItem[]): Promise<void> {
    const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems]

    const validItems = items.filter((item) => {
      const isValid = item && item.type && item.id
      if (!isValid) {
        logger.warn({ item }, 'Skipping visit recording for invalid item.')
      }
      return isValid
    })

    const itemCount = validItems.length

    if (itemCount === 0) {
      logger.debug('No valid items provided to recordVisit.')
      return
    }

    if (itemCount === 1) {
      const item = validItems[0]
      const redisKey = this.generateKey(item.type, item.id)
      try {
        await redis.incr(redisKey)
      } catch (error) {
        logger.error({ err: error, item }, 'Failed to increment Redis key for visit count')
      }
      return
    }

    const pipeline = redis.pipeline()

    for (const item of validItems) {
      const redisKey = this.generateKey(item.type, item.id)
      pipeline.incr(redisKey)
    }

    try {
      await pipeline.exec()
      return
    } catch (error) {
      logger.error({ err: error, itemCount }, 'Failed to execute Redis pipeline for visit counts')
    }
  }
}
