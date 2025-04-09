import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'series'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('enabled').defaultTo(false).notNullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('enabled')
    })
  }
}
