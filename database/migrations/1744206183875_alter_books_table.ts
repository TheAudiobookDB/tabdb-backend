import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'books'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('page', 'pages')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('pages', 'page')
    })
  }
}
