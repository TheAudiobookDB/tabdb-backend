import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'image_temps'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.specificType('public_id', 'char(16) DEFAULT nanoid()')
      table.unique('public_id')
      table.index('public_id')

      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.string('ip', 46)

      table.string('extension', 10).notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
