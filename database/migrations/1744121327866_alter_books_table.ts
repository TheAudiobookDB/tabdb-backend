import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'books'

  public async up() {
    this.defer(async () => {
      this.db.raw('ALTER TABLE "books" DROP COLUMN IF EXISTS "published_at"')
    })

    this.defer(async () => {
      this.db.raw('ALTER TABLE "books" DROP COLUMN IF EXISTS "country"')
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.string('language', 5).nullable().alter()
    })

    this.defer(async () => {
      this.db.raw('ALTER TABLE "books" DROP COLUMN IF EXISTS "type"')
      this.db.raw('DROP TYPE IF EXISTS books_type CASCADE')
      this.db.raw(`CREATE TYPE books_type AS ENUM ('book', 'audiobook', 'e-book', 'podcast')`)
      this.db.raw(`ALTER TABLE "books" ADD COLUMN "type" books_type DEFAULT 'audiobook'`)
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.datetime('published_at').nullable()
    })

    this.defer(async () => {
      this.db.raw('ALTER TABLE "books" DROP COLUMN IF EXISTS "type"')
      this.db.raw('DROP TYPE IF EXISTS books_type CASCADE')
      this.db.raw(`CREATE TYPE books_type AS ENUM ('book', 'audiobook', 'podcast')`)
      this.db.raw(`ALTER TABLE "books" ADD COLUMN "type" books_type DEFAULT 'audiobook'`)
    })
  }
}
