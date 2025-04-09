import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'logs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('state').defaultTo(0).notNullable()
      table.setNullable('model_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('state')
    })
  }
}
