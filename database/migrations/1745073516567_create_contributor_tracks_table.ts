import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contributor_track'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('contributor_id')
        .unsigned()
        .references('id')
        .inTable('contributors')
        .onDelete('CASCADE')
      table.integer('track_id').unsigned().references('id').inTable('tracks').onDelete('CASCADE')

      table.string('role', 255).nullable()

      table.unique(['contributor_id', 'track_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
