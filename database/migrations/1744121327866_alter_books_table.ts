import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'books'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('published_at')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.datetime('published_at').nullable()
    })
  }
}
