import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tracks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('book_id').unsigned().references('id').inTable('books').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['book_id'])
      table.dropColumn('book_id')
    })
  }
}
