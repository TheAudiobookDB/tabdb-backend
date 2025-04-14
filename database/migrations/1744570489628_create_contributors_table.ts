import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contributors'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.specificType('public_id', 'char(16) DEFAULT nanoid()')
      table.unique('public_id')
      table.index('public_id')

      table.string('name').notNullable()
      table.text('description').nullable()
      table.string('image').nullable()

      table.date('birth_date').nullable()
      table.string('country', 2).nullable()

      table.string('website').nullable()

      table.boolean('enabled').defaultTo(false).notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
