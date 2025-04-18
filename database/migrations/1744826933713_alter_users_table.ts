import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('username', 255).notNullable().unique().after('email')
      table.string('avatar', 255).nullable().after('username')
      table.integer('role').defaultTo(1).notNullable().after('avatar')
      table.text('custom_abilities').nullable().after('role')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('username')
      table.dropColumn('avatar')
      table.dropColumn('role')
      table.dropColumn('custom_abilities')

      table.dropUnique(['username'])
      table.dropUnique(['email'])
    })
  }
}
