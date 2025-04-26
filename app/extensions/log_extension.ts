import { LogAction, LogModel, LogState } from '../enum/log_enum.js'
import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { HttpContext } from '@adonisjs/core/http'
import Log from '#models/log'
import { nanoid } from '#config/app'
import * as model_1 from '@adonisjs/lucid/types/model'
import { LucidModel, ModelAssignOptions, ModelAttributes } from '@adonisjs/lucid/types/model'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'

export class LogExtension extends BaseModel {
  public async saveWithLog(
    logState?: LogState,
    trx?: TransactionClientContract,
    applyToModel: boolean = true
  ): Promise<this> {
    const changedValues = { ...this.$dirty }
    if (trx && applyToModel) this.useTransaction(trx)
    const result = await this.save()

    // If changedValues is empty, return
    if (Object.keys(changedValues).length === 0) {
      console.log('No changes detected, skipping log creation.')
      return result
    }

    const ctx = HttpContext.get()

    const log = new Log()
    log.userId = ctx?.auth?.user ? ctx.auth.user!.id : 1
    log.action = result.$isLocal ? LogAction.CREATE : LogAction.UPDATE
    log.model = this.constructor.name as LogModel
    log.modelId = this.publicId
    // @ts-ignore
    log.data = result.$isLocal ? null : changedValues
    log.state = logState ?? LogState.PENDING
    if (trx) {
      log.useTransaction(trx)
      await log.save()
    } else {
      void log.save()
    }

    return result
  }

  public async updateOrCreateManyWithLogs<T extends LucidModel>(
    this: T,
    predicate: keyof ModelAttributes<InstanceType<T>> | (keyof ModelAttributes<InstanceType<T>>)[],
    payload: Partial<ModelAttributes<InstanceType<T>>>[],
    options?: ModelAssignOptions,
    logState?: LogState
  ): Promise<InstanceType<T>[]> {
    const result = await this.updateOrCreateMany(predicate, payload, options)
    const ctx = HttpContext.get()

    const logs = payload.map((item) => {
      const log = new Log()
      log.userId = ctx ? ctx.auth.user!.id : 1
      log.action = LogAction.CREATE
      log.model = this.constructor.name as LogModel
      // @ts-ignore
      log.modelId = item.publicId
      // @ts-ignore
      log.data = item
      log.state = logState ?? LogState.PENDING

      return log
    })

    void Log.createMany(
      logs.map((log) => log.serialize()),
      { allowExtraProperties: true }
    )

    return result
  }

  @beforeCreate()
  public static ensurePublicId(model: model_1.ModelObject) {
    if (!model.publicId) {
      model.publicId = nanoid()
    }
  }

  @column({ serializeAs: 'id' })
  // @props({"name": "id"})
  declare publicId: string
}
