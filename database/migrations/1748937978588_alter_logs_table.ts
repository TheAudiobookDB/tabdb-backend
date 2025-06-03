import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'logs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.setNullable('changed_by')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropNullable('changed_by')
    })
  }
}
