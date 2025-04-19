import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'images'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.setNullable('book_id')

      table
        .integer('track_id')
        .unsigned()
        .references('id')
        .inTable('tracks')
        .onDelete('CASCADE')
        .nullable()

      this.schema.raw(
        'ALTER TABLE images ADD CONSTRAINT check_valid_image CHECK (book_id IS NOT NULL OR track_id IS NOT NULL)'
      )
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('track_id')

      table.dropChecks('check_valid_image')
    })
  }
}
