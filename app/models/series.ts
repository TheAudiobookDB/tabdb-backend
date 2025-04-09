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
import { Infer } from '@vinejs/vine/types'
import { seriesValidator } from '#validators/provider_validator'
import { ModelHelper } from '../helpers/model_helper.js'

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

  @column()
  declare enabled: boolean

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
    if (!series.enabled) return
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
    if (!series.enabled) return
    void seriesIndex.updateDocuments([
      {
        id: series.id,
        name: series.name,
        description: SearchEngineHelper.removeHtmlTags(series.description),
      },
    ])
  }

  public static async findByModelOrCreate(series: Infer<typeof seriesValidator>) {
    let currentSeries: Series | null = null
    if (series.id) {
      currentSeries = await Series.findBy('public_id', series.id)
    }
    if (!currentSeries && series.identifiers && series.identifiers.length > 0) {
      const tmp = (await ModelHelper.findByIdentifiers(Series, series.identifiers)) as
        | Series[]
        | null
      if (tmp && tmp.length > 0) currentSeries = tmp[0]
    }
    if (!currentSeries) {
      currentSeries = await Series.firstOrCreate(
        { name: series.name },
        {
          description: series.description,
        }
      )
      await ModelHelper.addIdentifier(currentSeries, series.identifiers)
    }

    return currentSeries
  }
}
