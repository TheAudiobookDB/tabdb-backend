import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'identifiers '

  async up() {
    const availableIdentifiers: string[] = [
      'audible:asin',
      'amazon:asin',
      'isbn10',
      'isbn13',
      'ean',
    ]

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.specificType('public_id', 'char(16) DEFAULT nanoid()')
      table.unique('public_id')
      table.index('public_id')

      table.string('value').notNullable()
      table.enum('type', availableIdentifiers).notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
