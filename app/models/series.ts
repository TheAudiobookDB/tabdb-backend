import { DateTime } from 'luxon'
import {
  afterCreate,
  afterUpdate,
  BaseModel,
  beforeCreate,
  column,
  manyToMany,
} from '@adonisjs/lucid/orm'
import Book from '#models/book'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import Identifier from '#models/identifier'
import { nanoid } from '#config/app'
import { seriesIndex } from '#config/meilisearch'
import { SearchEngineHelper } from '../helpers/search_engine.js'

export default class Series extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare publicId: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare image: string | null

  @column()
  declare position: number | null

  @manyToMany(() => Identifier)
  declare identifiers: ManyToMany<typeof Identifier>

  @manyToMany(() => Book, {
    pivotColumns: ['position'],
  })
  declare books: ManyToMany<typeof Book>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  public static async ensurePublicId(series: Series) {
    if (!series.publicId) {
      series.publicId = nanoid()
    }
  }

  @afterCreate()
  public static async afterCreateHook(series: Series) {
    void seriesIndex.addDocuments([
      {
        id: series.id,
        name: series.name,
        description: SearchEngineHelper.removeHtmlTags(series.description),
      },
    ])
  }

  @afterUpdate()
  public static async afterUpdateHook(series: Series) {
    void seriesIndex.updateDocuments([
      {
        id: series.id,
        name: series.name,
        description: SearchEngineHelper.removeHtmlTags(series.description),
      },
    ])
  }
}
