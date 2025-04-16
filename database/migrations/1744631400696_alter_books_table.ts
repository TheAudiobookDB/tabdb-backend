import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'books'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('publisher')

      table.integer('publisher_id').unsigned().references('id').inTable('publishers')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('publisher', 255).nullable()
      table.dropColumn('publisher_id')
    })
  }
}
