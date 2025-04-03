import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'books'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Books
      table.string('title').notNullable()
      table.string('subtitle').nullable()
      table.string('summary').nullable()
      table.string('description').nullable()
      table.string('publisher').nullable()
      table.string('image').nullable()
      table.string('language', 255).nullable()
      table.string('copyright').nullable()

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

      // TODO: Vector search
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
