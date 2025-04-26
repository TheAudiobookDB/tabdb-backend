import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'identifiers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('extra').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('extra')
    })
  }
}
