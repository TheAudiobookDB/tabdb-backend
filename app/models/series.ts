import { DateTime } from 'luxon'
import {
  afterCreate,
  afterUpdate,
  beforeCreate,
  column,
  manyToMany,
  scope,
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
import { LogExtension } from '../extensions/log_extension.js'
import { ImageExtension } from '../extensions/image_extension.js'
import { compose } from '@adonisjs/core/helpers'
import { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

type Builder = ModelQueryBuilderContract<typeof Series>

export default class Series extends compose(LogExtension, ImageExtension) {
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

  @column({ serializeAs: null })
  declare enabled: boolean

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null

  @column()
  declare language: string | null

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
        language: series.language
          ? {
              language: series.language.split('-')[0],
              code: series.language.includes('-') ? series.language.split('-')[1] : null,
            }
          : null,
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
        language: series.language
          ? {
              language: series.language.split('-')[0],
              code: series.language.includes('-') ? series.language.split('-')[1] : null,
            }
          : null,
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
        {
          name: series.name,
          ...(series.language ? { language: series.language } : {}),
        },
        {
          description: series.description,
        }
      )
      await ModelHelper.addIdentifier(currentSeries, series.identifiers)
    }

    return currentSeries
  }

  serializeExtras() {
    return {
      position: this.$extras.pivot_position,
    }
  }

  static minimal = scope((query: Builder) =>
    query.select(['publicId', 'name', 'image', 'enabled']).where('enabled', true)
  )

  static full = scope((query: Builder) => query.where('enabled', true).preloadOnce('identifiers'))

  declare position: number | null
}
