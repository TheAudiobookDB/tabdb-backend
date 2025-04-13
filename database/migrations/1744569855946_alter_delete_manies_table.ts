import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'delete_manies'

  async up() {
    this.raw(`
      DROP TABLE IF EXISTS authors, narrators, identifier_narrator, author_identifier;
    `)
  }
}
