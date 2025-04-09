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
import { narratorIndex } from '#config/meilisearch'
import { SearchEngineHelper } from '../helpers/search_engine.js'

export default class Narrator extends BaseModel {
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
  declare enabled: boolean

  @manyToMany(() => Book, {
    pivotColumns: ['role'],
  })
  declare books: ManyToMany<typeof Book>

  @manyToMany(() => Identifier)
  declare identifiers: ManyToMany<typeof Identifier>

  @column()
  declare role: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  public static ensurePublicId(narrator: Narrator) {
    if (!narrator.publicId) {
      narrator.publicId = nanoid()
    }
  }

  @afterCreate()
  public static async afterCreateHook(narrator: Narrator) {
    if (!narrator.enabled) return
    void narratorIndex.addDocuments([
      {
        id: narrator.id,
        name: narrator.name,
        description: SearchEngineHelper.removeHtmlTags(narrator.description),
      },
    ])
  }

  @afterUpdate()
  public static async afterUpdateHook(narrator: Narrator) {
    if (!narrator.enabled) return
    void narratorIndex.updateDocuments([
      {
        id: narrator.id,
        name: narrator.name,
        description: SearchEngineHelper.removeHtmlTags(narrator.description),
      },
    ])
  }
}
