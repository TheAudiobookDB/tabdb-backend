import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'identifier_series'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('identifier_id')
        .unsigned()
        .references('id')
        .inTable('identifiers')
        .onDelete('CASCADE')
      table.integer('series_id').unsigned().references('id').inTable('series').onDelete('CASCADE')
      table.unique(['identifier_id', 'series_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
