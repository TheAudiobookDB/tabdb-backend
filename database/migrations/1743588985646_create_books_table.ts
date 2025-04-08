import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'books'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.specificType('public_id', 'char(16) DEFAULT nanoid()')
      table.unique('public_id')
      table.index('public_id')

      // Books
      table.string('title', 1023).notNullable()
      table.string('subtitle', 1023).nullable()
      table.text('summary').nullable()
      table.text('description').nullable()
      table.string('publisher', 1023).nullable()
      table.string('image').nullable()
      table.string('language', 255).nullable()
      table.string('copyright', 1023).nullable()

      table.integer('page', 6).nullable().defaultTo(null)
      table.integer('duration').nullable()

      table.datetime('published_at').nullable()
      table.datetime('released_at').nullable()

      table.boolean('is_explicit').defaultTo(false)
      table.boolean('is_abridged').nullable()

      // Type [Enum - Book, Audiobook, Podcast]
      table.enum('type', ['book', 'audiobook', 'podcast']).defaultTo('audiobook')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
