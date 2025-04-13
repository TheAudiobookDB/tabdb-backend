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
import { contributorIndex } from '#config/meilisearch'
import { SearchEngineHelper } from '../helpers/search_engine.js'
import { Infer } from '@vinejs/vine/types'
import { contributorValidator } from '#validators/provider_validator'
import { ModelHelper } from '../helpers/model_helper.js'
import { ContributorType } from '../enum/contributor_enum.js'
import { assert } from '@japa/assert'

export default class Contributor extends BaseModel {
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
    pivotColumns: ['role', 'type'],
  })
  declare books: ManyToMany<typeof Book>

  @manyToMany(() => Identifier)
  declare identifiers: ManyToMany<typeof Identifier>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  public static ensurePublicId(contributor: Contributor) {
    if (!contributor.publicId) {
      contributor.publicId = nanoid()
    }
  }

  @afterCreate()
  public static async afterCreateHook(contributor: Contributor) {
    if (!contributor.enabled) return
    assert(contributor.$extras.pivot_type)
    void contributorIndex.addDocuments([
      {
        id: contributor.id,
        name: contributor.name,
        description: SearchEngineHelper.removeHtmlTags(contributor.description),
      },
    ])
  }

  @afterUpdate()
  public static async afterUpdateHook(contributor: Contributor) {
    if (!contributor.enabled) return
    assert(contributor.$extras.pivot_type)
    void contributorIndex.updateDocuments([
      {
        id: contributor.id,
        name: contributor.name,
        description: SearchEngineHelper.removeHtmlTags(contributor.description),
        type: contributor.$extras.pivot_type,
      },
    ])
  }

  public static async findByModelOrCreate(contributor: Infer<typeof contributorValidator>) {
    let currentContributor: Contributor | null = null
    if (contributor.id) {
      currentContributor = await Contributor.findBy('public_id', contributor.id)
    }
    if (!currentContributor && contributor.identifiers && contributor.identifiers.length > 0) {
      const tmp = (await ModelHelper.findByIdentifiers(Contributor, contributor.identifiers)) as
        | Contributor[]
        | null
      if (tmp && tmp.length > 0) currentContributor = tmp[0]
    }
    if (!currentContributor) {
      currentContributor = await Contributor.firstOrCreate(
        { name: contributor.name },
        {
          description: contributor.description,
        }
      )
      await ModelHelper.addIdentifier(currentContributor, contributor.identifiers)
    }

    return currentContributor
  }

  serializeExtras() {
    const type: number | null = this.$extras.pivot_type
    const lowercaseContributorTypeString: string | null =
      type !== null && ContributorType[type] !== undefined
        ? ContributorType[type].toLowerCase()
        : null

    return {
      ...(type === ContributorType.NARRATOR ? { role: this.$extras.pivot_role } : {}),
      type: type,
      typeString: lowercaseContributorTypeString,
    }
  }

  declare role: string | null
}
