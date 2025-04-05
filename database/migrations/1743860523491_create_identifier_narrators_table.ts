import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'identifier_narrator'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('narrator_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('narrators')
        .onDelete('CASCADE')
      table
        .integer('identifier_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('identifiers')
        .onDelete('CASCADE')
      table.unique(['narrator_id', 'identifier_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
