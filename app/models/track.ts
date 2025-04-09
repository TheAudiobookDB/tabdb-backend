import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column, computed } from '@adonisjs/lucid/orm'
import Book from '#models/book'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { nanoid } from '#config/app'
import { Infer } from '@vinejs/vine/types'
import { trackValidator } from '#validators/provider_validator'

export default class Track extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare publicId: string

  @column()
  declare name: string

  @column()
  declare start: number

  @column()
  declare end: number

  @computed()
  get duration() {
    return this.end - this.start
  }

  @column({ serializeAs: null })
  declare bookId: number

  @belongsTo(() => Book)
  declare book: BelongsTo<typeof Book>

  @column.dateTime({ autoCreate: true, serializeAs: null })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  declare updatedAt: DateTime

  @beforeCreate()
  public static ensurePublicId(track: Track) {
    if (!track.publicId) {
      track.publicId = nanoid()
    }
  }

  public static async findByModelOrCreate(track: Infer<typeof trackValidator>, book: Book) {
    let currentTrack = null
    if (track.id) {
      currentTrack = await Track.findBy('public_id', track.id)
    }
    if (!currentTrack && track.name && book.id) {
      currentTrack = await Track.firstOrCreate(
        { name: track.name, bookId: book.id },
        {
          start: track.start,
          end: track.end,
        }
      )
    }
    return currentTrack
  }
}
