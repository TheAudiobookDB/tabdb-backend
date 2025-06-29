import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {

    const tables = [
      'contributors',
      'genres',
      'series',
      'publishers',
      'tracks',
      'identifiers',
      'users',
      'book_groups',
      'images',
    ]

    for (const tableName of tables) {
      this.schema.alterTable(tableName, (table) => {
        table.timestamp('deleted_at').nullable()
      })
    }
  }

  async down() {
    const tables = [
      'contributors',
      'genres',
      'series',
      'publishers',
      'tracks',
      'identifiers',
      'users',
      'book_groups',
      'images',
    ]

    for (const tableName of tables) {
      this.schema.alterTable(tableName, (table) => {
        table.dropColumn('deleted_at')
      })
    }
  }
}
