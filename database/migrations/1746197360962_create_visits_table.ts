import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'visits'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('trackable_type', 20).notNullable()
      table.specificType('trackable_id', 'char(16)').notNullable()
      table.integer('interval_type', 1).notNullable()

      table.integer('visit_count').unsigned().notNullable().defaultTo(0)
      table.date('interval_start_date').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['trackable_type', 'trackable_id', 'interval_type', 'interval_start_date'])

      table.index(['interval_type', 'interval_start_date'], 'visit_counts_interval_type_date_idx')

      table.index(['trackable_type', 'trackable_id'], 'visit_counts_trackable_idx')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
