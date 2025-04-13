import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'book_contributor'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('book_id').unsigned().references('id').inTable('books')
      table.integer('contributor_id').unsigned().references('id').inTable('contributors')
      table.unique(['book_id', 'contributor_id'])
      table.string('role', 255).nullable()
      table.integer('type', 2).notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
