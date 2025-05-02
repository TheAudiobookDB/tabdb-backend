import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import redis from '@adonisjs/redis/services/main'
import Visit from '#models/visit'
import { IntervalType } from '../app/enum/interval_enum.js'

export default class SyncVisits extends BaseCommand {
  static commandName = 'sync:visits'
  static description = ''

  /**
   * Command configuration. startApp ensures the app is booted
   * and DB/Redis connections are available.
   */
  static options: CommandOptions = {
    startApp: true,
  }

  private redisPrefix = 'visits'
  private scanCount = 100
  private batchSize = 500
  private targetIntervalType: IntervalType = IntervalType.DAILY

  private getIntervalStartDate(): string {
    const now = DateTime.now()
    if (this.targetIntervalType === IntervalType.DAILY) {
      return now.toISODate()!
    } else if (this.targetIntervalType === IntervalType.WEEKLY) {
      // Assuming week starts on Monday as per Luxon default
      return now.startOf('week').toISODate()!
    } else {
      // Monthly
      return now.startOf('month').toISODate()!
    }
  }

  private isNextIntervalStart(): boolean {
    const now = DateTime.now()
    const nextHour = now.plus({ day: 1 })
    if (this.targetIntervalType === IntervalType.DAILY) {
      return nextHour.startOf('day').toISODate() !== now.toISODate()
    } else if (this.targetIntervalType === IntervalType.WEEKLY) {
      return nextHour.startOf('week').toISODate() !== now.toISODate()
    } else {
      // Monthly
      return nextHour.startOf('month').toISODate() !== now.toISODate()
    }
  }

  async run() {
    this.logger.info(
      `Starting Redis to Postgres visit count sync for interval: ${this.targetIntervalType}`
    )

    let cursor = '0'
    const keysToProcess: string[] = []
    const intervalStartDate = this.getIntervalStartDate()

    this.logger.info(`Scanning Redis for keys matching '${this.redisPrefix}:*'`)
    try {
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          `${this.redisPrefix}:*`,
          'COUNT',
          this.scanCount
        )
        cursor = nextCursor
        keysToProcess.push(...keys)
      } while (cursor !== '0')
    } catch (error) {
      this.logger.error(error)
      return
    }

    if (keysToProcess.length === 0) {
      this.logger.info('No visit keys found in Redis to sync.')
      return
    }
    this.logger.info(`Found ${keysToProcess.length} potential keys to process.`)

    for (let i = 0; i < keysToProcess.length; i += this.batchSize) {
      const batchKeys = keysToProcess.slice(i, i + this.batchSize)
      const batchNumber = i / this.batchSize + 1
      this.logger.debug(`Processing batch ${batchNumber}...`)

      try {
        const counts = await redis.mget(batchKeys)

        const recordsToUpsert: any[] = []
        let keysInPipeline = 0

        for (const [j, key] of batchKeys.entries()) {
          const countStr = counts[j]

          if (countStr === null || countStr === undefined) {
            this.logger.warning(`Key from SCAN not found in MGET (batch ${batchNumber}), skipping.`)
            continue
          }

          const count = Number.parseInt(countStr, 10)
          if (Number.isNaN(count) || count <= 0) {
            continue
          }

          const parts = key.split(':')
          if (parts.length !== 3) {
            continue
          }
          const [, type, idStr] = parts

          recordsToUpsert.push({
            trackableType: type,
            trackableId: idStr,
            intervalType: this.targetIntervalType,
            intervalStartDate: intervalStartDate,
            visitCount: count,
          })

          keysInPipeline++
        }

        if (recordsToUpsert.length > 0) {
          await Visit.updateOrCreateMany(
            ['trackableType', 'trackableId', 'intervalType', 'intervalStartDate'],
            recordsToUpsert
          )
          this.logger.debug(`Upsert successful (batch ${batchNumber}).`)

          if (this.isNextIntervalStart()) {
            redis.del(batchKeys)
          }
        } else {
          this.logger.info(`No valid records to upsert in batch ${batchNumber}.`)
        }
      } catch (error) {
        this.logger.error({ message: error })
      }
    }

    this.logger.info('Visit count sync finished.')
  }
}
