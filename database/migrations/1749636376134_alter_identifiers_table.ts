import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'identifiers'

  async up() {
    this.schema.alterTable(this.tableName, (_) => {
      this.db.rawQuery('ALTER TABLE identifiers DROP CONSTRAINT identifiers_type_check;').exec()
    })
  }
}
