import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'book_series'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('position').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('position').unsigned().alter()
    })
  }
}
