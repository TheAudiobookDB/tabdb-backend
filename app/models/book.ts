import { DateTime } from 'luxon'
import { afterFind, BaseModel, belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import Author from '#models/author'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Narrator from '#models/narrator'
import Genre from '#models/genre'
import Identifier from '#models/identifier'
import Series from '#models/series'
import Track from '#models/track'
import BookGroup from '#models/book_group'

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
  declare groupId: number | null

  @column()
  declare enabled: boolean

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column()
  // @enum(book, audiobook, podcast)
  declare type: 'book' | 'audiobook' | 'podcast'

  @manyToMany(() => Author, {
    pivotTable: 'book_author',
  })
  declare authors: ManyToMany<typeof Author>

  @manyToMany(() => Narrator, {
    pivotColumns: ['role'],
  })
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
    foreignKey: 'bookId',
  })
  declare tracks: HasMany<typeof Track>

  @belongsTo(() => BookGroup, {
    foreignKey: 'groupId',
    localKey: 'id',
  })
  declare group: BelongsTo<typeof BookGroup>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @afterFind()
  public static async afterFindHook(book: Book) {
    if (book.narrators) {
      for (let i = 0; i < book.narrators.length; i++) {
        const narrator = book.narrators[i]
        if (narrator.$extras.pivot_role) {
          book.narrators[i].role = narrator.$extras.pivot_role
        }
      }
    }
    if (book.series) {
      for (let i = 0; i < book.series.length; i++) {
        const series = book.series[i]
        if (series.$extras.pivot_position) {
          book.series[i].position = series.$extras.pivot_position
        }
      }
    }
  }
}
