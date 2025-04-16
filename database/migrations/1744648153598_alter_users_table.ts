import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.specificType('public_id', 'char(16) DEFAULT nanoid()')
      table.unique('public_id')
      table.index('public_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex('public_id')
      table.dropColumn('public_id')
    })
  }
}
