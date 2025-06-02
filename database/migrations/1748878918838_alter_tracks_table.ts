import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tracks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('parent')
        .unsigned()
        .references('id')
        .inTable('tracks')
        .onDelete('CASCADE')
        .nullable()

      // 1 - Chapter
      // 2 - intro
      // 3 - outro
      // 4 - publisher intro
      // 5 - publisher outro
      table.integer('type', 2).unsigned().defaultTo(1)

      table.index(['parent'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['parent'])
      table.dropColumn('parent')
      table.dropColumn('type')
    })
  }
}
