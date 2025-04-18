import { DateTime } from 'luxon'
import { afterCreate, afterUpdate, beforeCreate, column, hasMany, scope } from '@adonisjs/lucid/orm'
import { nanoid } from '#config/app'
import { publisherIndex } from '#config/meilisearch'
import Book from '#models/book'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { Infer } from '@vinejs/vine/types'
import { publisherValidator } from '#validators/provider_validator'
import { LogExtension } from '../extensions/log_extension.js'
import { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

type Builder = ModelQueryBuilderContract<typeof Publisher>

export default class Publisher extends LogExtension {
  @column({ isPrimary: true })
  declare id: number

  @column({ serializeAs: 'id' })
  declare publicId: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column({ serializeAs: null })
  declare enabled: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Book)
  declare books: HasMany<typeof Book>

  @beforeCreate()
  public static ensurePublicId(publisher: Publisher) {
    if (!publisher.publicId) {
      publisher.publicId = nanoid()
    }
  }

  private static buildSearchDocument(publisher: Publisher) {
    return {
      id: publisher.id,
      name: publisher.name,
    }
  }

  private static async processSearchIndex(
    publisher: Publisher,
    action: 'add' | 'update'
  ): Promise<void> {
    if (publisher.enabled && publisher.id) {
      const doc = this.buildSearchDocument(publisher)
      if (action === 'add') {
        void publisherIndex.addDocuments([doc])
      } else {
        void publisherIndex.updateDocuments([doc])
      }
    }
  }

  @afterCreate()
  public static async afterCreateHook(publisher: Publisher) {
    void this.processSearchIndex(publisher, 'add')
  }

  @afterUpdate()
  public static async afterUpdateHook(publisher: Publisher) {
    void this.processSearchIndex(publisher, 'update')
  }

  public static async findByModelOrCreate(publisher: Infer<typeof publisherValidator>) {
    if ('id' in publisher && publisher.id) {
      const existingGenre = await Publisher.findBy('public_id', publisher.id)
      if (existingGenre) {
        return existingGenre
      }
    }
    if ('name' in publisher && publisher.name) {
      const existingGenre = await Publisher.firstOrCreate(
        {
          name: publisher.name,
        },
        {
          description: publisher.description,
        }
      )
      if (existingGenre) {
        return existingGenre
      }
    }
    return undefined
  }

  static minimal = scope((query: Builder) => {
    query.select(['publicId', 'name', 'enabled']).where('enabled', true)
  })

  static full = scope((query: Builder) => {
    // @ts-ignore
    query
  })
}
