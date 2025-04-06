import { BaseSchema } from '@adonisjs/lucid/schema'
import fs from 'node:fs'
import path from 'node:path'

export default class extends BaseSchema {
  async up() {
    const filePath = path.join(import.meta.dirname, '../sql', 'nanoid.sql')
    const sql = fs.readFileSync(filePath, 'utf8')
    this.schema.raw(sql)
  }

  async down() {}
}
