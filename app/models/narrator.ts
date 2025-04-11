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
import { Infer } from '@vinejs/vine/types'
import { narratorValidator } from '#validators/provider_validator'
import { ModelHelper } from '../helpers/model_helper.js'

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

  @column({ serializeAs: null })
  declare enabled: boolean

  @manyToMany(() => Book, {
    pivotColumns: ['role'],
  })
  declare books: ManyToMany<typeof Book>

  @manyToMany(() => Identifier)
  declare identifiers: ManyToMany<typeof Identifier>

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

  public static async findByModelOrCreate(narrator: Infer<typeof narratorValidator>) {
    let currentNarrator: Narrator | null = null
    if (narrator.id) {
      currentNarrator = await Narrator.findBy('public_id', narrator.id)
    }
    if (!currentNarrator && narrator.identifiers && narrator.identifiers.length > 0) {
      const tmp = (await ModelHelper.findByIdentifiers(Narrator, narrator.identifiers)) as
        | Narrator[]
        | null
      if (tmp && tmp.length > 0) currentNarrator = tmp[0]
    }
    if (!currentNarrator) {
      currentNarrator = await Narrator.firstOrCreate(
        { name: narrator.name },
        {
          description: narrator.description,
        }
      )
      await ModelHelper.addIdentifier(currentNarrator, narrator.identifiers)
    }

    return currentNarrator
  }

  serializeExtras() {
    return {
      role: this.$extras.pivot_role,
    }
  }

  declare role: string | null
}
