import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'book_contributor'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['book_id', 'contributor_id'])
      table.unique(['book_id', 'contributor_id', 'type'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['book_id', 'contributor_id', 'type'])
      table.unique(['book_id', 'contributor_id'])
    })
  }
}
