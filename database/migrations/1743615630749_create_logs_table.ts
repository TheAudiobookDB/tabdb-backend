import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.specificType('public_id', 'char(16) DEFAULT nanoid()')
      table.unique('public_id')
      table.index('public_id')

      table.enum('action', ['create', 'update', 'delete']).notNullable()
      table
        .enum('entity', [
          'book',
          'book_identifier',
          'book_genre',
          'book_narrator',
          'book_series',
          'genre',
          'identifier',
          'narrator',
          'series',
        ])
        .notNullable()
      table.integer('entity_id').unsigned().notNullable()

      table.integer('user_id').unsigned().notNullable().references('id').inTable('users')

      table.json('old_data').nullable()
      table.json('new_data').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
