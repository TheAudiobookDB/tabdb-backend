import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'logs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('changed_by').unsigned().notNullable().references('id').inTable('users')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('changed_by')
    })
  }
}
