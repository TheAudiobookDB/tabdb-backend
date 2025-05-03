import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import redis from '@adonisjs/redis/services/main'
import { IntervalType } from '../app/enum/interval_enum.js'
import db from '@adonisjs/lucid/services/db'
import { schedule } from 'adonisjs-scheduler'

@schedule((s) => s.hourlyAt(0))
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
  private targetIntervalType: IntervalType = IntervalType.WEEKLY

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

        const valuePlaceholders = []

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

          /**
           *             trackable_type: type,
           *             trackable_id: idStr,
           *             interval_type: this.targetIntervalType,
           *             interval_start_date: intervalStartDate,
           *             visit_count: count,
           */
          recordsToUpsert.push(type, idStr, this.targetIntervalType, intervalStartDate, count)

          const placeholders = []
          for (let k = 0; k < 5; k++) {
            placeholders.push(`?`)
          }
          valuePlaceholders.push(`(${placeholders.join(', ')})`)

          keysInPipeline++
        }

        if (recordsToUpsert.length > 0) {
          const sql = `INSERT INTO visits (trackable_type,trackable_id,interval_type,interval_start_date,visit_count) VALUES ${valuePlaceholders.join(',')} ON CONFLICT (trackable_type, trackable_id, interval_type, interval_start_date) DO UPDATE SET visit_count = visits.visit_count + EXCLUDED.visit_count;`

          await db.rawQuery(sql, recordsToUpsert)

          this.logger.debug(`Upsert successful (batch ${batchNumber}).`)

          redis.del(batchKeys)
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
