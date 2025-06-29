import { DateTime } from 'luxon'
import { NormalizeConstructor } from '@adonisjs/core/types/helpers'
import { LucidModel } from '@adonisjs/lucid/types/model'

export function SoftDelete<T extends NormalizeConstructor<LucidModel>>(superclass: T) {
  class SoftDeleteModel extends superclass {
    /**
     * Soft delete the model instance
     */
    public async softDelete() {
      ;(this as any).deletedAt = DateTime.now()
      await this.save()
    }

    /**
     * Restore a soft deleted model instance
     */
    public async restore() {
      ;(this as any).deletedAt = null
      await this.save()
    }

    /**
     * Check if the model instance is soft deleted
     */
    public get isDeleted(): boolean {
      return (this as any).deletedAt !== null
    }
  }

  return SoftDeleteModel as T & typeof SoftDeleteModel
}
