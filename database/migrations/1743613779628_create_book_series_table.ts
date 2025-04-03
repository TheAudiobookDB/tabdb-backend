import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'book_series'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('book_id').unsigned().references('id').inTable('books')
      table.integer('series_id').unsigned().references('id').inTable('series')
      table.integer('position').unsigned()
      table.unique(['book_id', 'series_id', 'position'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
