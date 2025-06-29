import { DateTime } from 'luxon'

export class SoftDeleteHelper {
  /**
   * Perform soft delete on a model instance
   */
  static async softDelete(model: any): Promise<void> {
    model.deletedAt = DateTime.now()
    await model.save()
  }

  /**
   * Restore a soft deleted model instance
   */
  static async restore(model: any): Promise<void> {
    model.deletedAt = null
    await model.save()
  }

  /**
   * Check if the model instance is soft deleted
   */
  static isDeleted(model: any): boolean {
    return model.deletedAt !== null
  }
}
