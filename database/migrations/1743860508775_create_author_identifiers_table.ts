import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'author_identifier'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('author_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('authors')
        .onDelete('CASCADE')
      table
        .integer('identifier_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('identifiers')
        .onDelete('CASCADE')
      table.unique(['author_id', 'identifier_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
