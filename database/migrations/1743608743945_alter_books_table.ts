import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'books'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // ALTER TABLE books ADD COLUMN ts tsvector
      //     GENERATED ALWAYS AS (to_tsvector('english', title)) STORED;
      table.specificType(
        'title_ts',
        "tsvector GENERATED ALWAYS AS (to_tsvector('english', title)) STORED"
      )
      table.specificType(
        'subtitle_ts',
        "tsvector GENERATED ALWAYS AS (to_tsvector('english', subtitle)) STORED"
      )
      table.specificType(
        'description_ts',
        "tsvector GENERATED ALWAYS AS (to_tsvector('english', description)) STORED"
      )
      table.specificType(
        'summary_ts',
        "tsvector GENERATED ALWAYS AS (to_tsvector('english', summary)) STORED"
      )

      this.defer(async (db) => {
        await db.rawQuery(
          `CREATE INDEX IF NOT EXISTS books_title_ts_index ON ${this.tableName} USING GIN(title_ts);`
        )
        await db.rawQuery(
          `CREATE INDEX IF NOT EXISTS books_subtitle_ts_index ON ${this.tableName} USING GIN(subtitle_ts);`
        )
        await db.rawQuery(
          `CREATE INDEX IF NOT EXISTS books_description_ts_index ON ${this.tableName} USING GIN(description_ts);`
        )
        await db.rawQuery(
          `CREATE INDEX IF NOT EXISTS books_summary_ts_index ON ${this.tableName} USING GIN(summary_ts);`
        )
      })
    })
  }

  async down() {
    await this.db.rawQuery(`DROP INDEX IF EXISTS books_title_ts_index;`)
    await this.db.rawQuery(`DROP INDEX IF EXISTS books_subtitle_ts_index;`)
    await this.db.rawQuery(`DROP INDEX IF EXISTS books_description_ts_index;`)
    await this.db.rawQuery(`DROP INDEX IF EXISTS books_summary_ts_index;`)

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns('title_ts')
      table.dropColumns('subtitle_ts')
      table.dropColumns('description_ts')
      table.dropColumns('summary_ts')
    })
  }
}
