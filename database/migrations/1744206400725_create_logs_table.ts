import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.specificType('public_id', 'char(16) DEFAULT nanoid()')
      table.unique('public_id')
      table.index('public_id')

      table.integer('action').notNullable()
      table.string('model').notNullable()
      table.specificType('model_id', 'char(16)').notNullable()

      table.integer('user_id').unsigned().notNullable().references('id').inTable('users')

      table.json('data').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
