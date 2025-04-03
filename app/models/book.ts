import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import Author from '#models/author'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Narrator from '#models/narrator'
import Genre from '#models/genre'
import Identifier from '#models/identifier'
import Series from '#models/series'
import Track from '#models/track'

export default class Book extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare subtitle: string | null

  @column()
  declare summary: string | null

  @column()
  declare description: string | null

  @column()
  declare publisher: string | null

  @column()
  declare image: string | null

  @column()
  declare language: string | null

  @column()
  declare copyright: string | null

  @column()
  declare pages: number | null

  @column()
  declare duration: number | null

  @column.dateTime()
  declare publishedAt: DateTime | null

  @column.dateTime()
  declare releasedAt: DateTime | null

  @column()
  declare isExplicit: boolean

  @column()
  declare isAbridged: boolean | null

  @column()
  declare type: 'book' | 'audiobook' | 'podcast'

  @manyToMany(() => Author, {
    pivotTable: 'book_author',
  })
  declare authors: ManyToMany<typeof Author>

  @manyToMany(() => Narrator)
  declare narrators: ManyToMany<typeof Narrator>

  @manyToMany(() => Genre)
  declare genres: ManyToMany<typeof Genre>

  @manyToMany(() => Identifier)
  declare identifiers: ManyToMany<typeof Identifier>

  @manyToMany(() => Series, {
    pivotColumns: ['position'],
  })
  declare series: ManyToMany<typeof Series>

  @hasMany(() => Track, {
    foreignKey: 'id',
  })
  declare tracks: HasMany<typeof Track>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
