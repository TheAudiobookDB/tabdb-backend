import Book from '#models/book'
import { ModelObject } from '@adonisjs/lucid/types/model'
import { Infer } from '@vinejs/vine/types'
import Genre from '#models/genre'
import Contributor from '#models/contributor'
import Series from '#models/series'
import Track from '#models/track'
import Publisher from '#models/publisher'
import {
  addContributorValidator,
  addIdValidator,
  addSeriesValidator,
  addTrackValidator,
  mergeItemsValidation,
} from '#validators/crud_validator'
import db from '@adonisjs/lucid/services/db'
import { TrackType } from '../enum/track_enum.js'
import { nanoid } from '#config/app'
import logger from '@adonisjs/core/services/logger'

export class BooksHelper {
  static async addGenreToBook(book: Book, genres?: Infer<typeof addIdValidator>[]) {
    if (!genres || genres.length === 0) return

    const genresModel = await Genre.query()
      .whereIn(
        'public_id',
        genres.map((genre) => genre.id)
      )
      .whereNull('deleted_at')

    if (genresModel.length === 0) {
      // Log a warning if no genres were found
      logger.warn('No valid genres were supplied for book', book.id)
    }

    book.$pushRelated('genres', genresModel)
    await book.related('genres').saveMany(genresModel)
  }

  static async addContributorToBook(
    book: Book | Track,
    contributors?: Infer<typeof addContributorValidator>[]
  ) {
    if (!contributors || contributors.length === 0) return

    const roles: Record<number, ModelObject> = {}
    const duplicateContributors: Record<number, ModelObject>[] = []

    if (!book.contributors) {
      // @ts-ignore
      await book.load('contributors', (q) => q.pivotColumns(['role', 'type']))
    }
    if (book.contributors && book.contributors.length > 0) {
      for (const contributor of book.contributors) {
        const role = contributor.$extras.pivot_role
        const type = contributor.$extras.pivot_type

        const duplicate = roles[contributor.id]

        if (duplicate && duplicate.type === type) {
          console.log('duplicate1', duplicate)
          continue
        }

        if (duplicate) {
          const tmpRecord: Record<number, ModelObject> = {}
          tmpRecord[contributor.id] = { role, type }
          if (
            !duplicateContributors.some(
              (entry) => entry[contributor.id] && entry[contributor.id].type === type
            )
          ) {
            if (role) {
              tmpRecord[contributor.id] = { role, type }
            } else {
              tmpRecord[contributor.id] = { type }
            }
            duplicateContributors.push(tmpRecord)
          }
        } else {
          if (role) {
            roles[contributor.id] = { role, type }
          } else {
            roles[contributor.id] = { type }
          }
        }
      }
    }

    const narratorModels = await Contributor.query()
      .whereIn(
        'public_id',
        contributors.map((contributor) => contributor.id)
      )
      .whereNull('deleted_at')

    if (narratorModels.length === 0) throw Error('No valid contributors were supplied')

    for (const contributor of contributors) {
      const narratorModel = narratorModels.find((model) => model.publicId === contributor.id)
      if (!narratorModel) continue

      const role = contributor.role
      const type = contributor.type

      const duplicate = roles[narratorModel.id]
      if (duplicate && duplicate.role === role && duplicate.type === type) {
        console.log('duplicate', duplicate)
        continue
      }

      if (duplicate) {
        const tmpRecord: Record<number, ModelObject> = {}
        tmpRecord[narratorModel.id] = { role, type }
        if (
          !duplicateContributors.some(
            (entry) => entry[narratorModel.id] && entry[narratorModel.id].type === type
          )
        ) {
          if (role) {
            tmpRecord[narratorModel.id] = { role, type }
          } else {
            tmpRecord[narratorModel.id] = { type }
          }
          duplicateContributors.push(tmpRecord)
        }
      } else {
        if (role) {
          roles[narratorModel.id] = { role, type }
        } else {
          roles[narratorModel.id] = { type }
        }
      }
    }

    // TODO: Investigate why .sync() is not working
    // @ts-ignore
    await book.related('contributors').detach(roles)

    // @ts-ignore
    await book.related('contributors').attach(roles)

    if (duplicateContributors) {
      for (const duplicate of duplicateContributors) {
        //await book.related('contributors').detach(duplicate)
        // @ts-ignore
        await book.related('contributors').attach(duplicate)
      }
    }
  }

  static async addSeriesToBook(book: Book, payloadObject?: Infer<typeof addSeriesValidator>[]) {
    if (!payloadObject || payloadObject.length === 0) return

    const positions: Record<string, ModelObject> = {}

    const seriesModels = await Series.query()
      .whereIn(
        'public_id',
        payloadObject.map((serie) => serie.id)
      )
      .whereNull('deleted_at')

    if (seriesModels.length === 0) throw Error('No valid series were supplied')

    for (const serie of seriesModels) {
      const position = payloadObject.find((s) => s.id === serie.publicId)?.position
      if (position) {
        positions[serie.id] = { position }
      } else {
        positions[serie.id] = {}
      }
    }

    if (!book.series) {
      await book.load('series', (q) => q.pivotColumns(['position']))
    }
    if (book.series && book.series.length > 0) {
      for (const serie of book.series) {
        if (serie.$extras.pivot_position) {
          positions[serie.id] = { position: serie.$extras.pivot_position }
        } else {
          positions[serie.id] = {}
        }
      }
    }

    await book.related('series').sync(positions)
  }

  static async addTrackToBook(book: Book, ids?: Infer<typeof addIdValidator>[]) {
    if (!ids || ids.length === 0) return
    const tracks = await Track.findManyBy('public_id', ids)

    if (tracks.length === 0) throw Error('No valid tracks were supplied')

    book.$pushRelated('tracks', tracks)
    await book.related('tracks').saveMany(tracks)
  }

  static async addPublisherToBook(book: Book, publisher?: Infer<typeof addIdValidator>) {
    if (!publisher) return

    const publisherModel = await Publisher.query()
      .where('public_id', publisher.id)
      .whereNull('deleted_at')
      .firstOrFail()

    book.$setRelated('publisher', publisherModel)
    await book.related('publisher').associate(publisherModel)
  }

  static async addTracksToBook(book: Book, tracks?: Infer<typeof addTrackValidator>[]) {
    if (!tracks || tracks.length === 0) return

    const existingTracks: Infer<typeof addTrackValidator>[] = []
    const toCreateTracks: Array<{
      name: string
      start: number
      end: number
      type: TrackType
      book_id: number
      public_id: string
    }> = []

    for (const track of tracks) {
      if (track.id) {
        existingTracks.push(track)
      } else {
        console.log(book.id)
        toCreateTracks.push({
          name: track.name!,
          start: track.start!,
          end: track.end!,
          type: track.type! as TrackType,
          public_id: nanoid(),
          book_id: book.id,
        })
      }
    }

    const trackModels = await Track.query()
      .whereIn(
        'public_id',
        existingTracks.map((track) => track.id as string)
      )
      .whereNull('deleted_at')

    if (!trackModels || trackModels.length !== existingTracks.length) {
      throw Error('At least one of the provided tracks does not exist')
    }

    const trx = await db.transaction()

    trackModels.push(
      ...(await Track.createMany(toCreateTracks, {
        client: trx,
      }))
    )

    await trx.commit()
  }

  static async mergeBooks(
    book1: Book,
    book2: Book,
    payload: Infer<typeof mergeItemsValidation>
  ): Promise<Book> {
    if (!book1 || !book2) throw Error('Both books must be provided')

    const keepBook1: string[] = payload.item1.keep
    const keepBook2: string[] = payload.item2.keep

    const commonFields = keepBook1.filter((field) => keepBook2.includes(field))
    if (commonFields.length > 0) {
      throw Error(
        `The following fields are present in both keepBook1 and keepBook2: ${commonFields.join(
          ', '
        )}`
      )
    }

    const trx = await db.transaction()

    try {
      const fieldsToKeepFromBook2 = keepBook2.filter((field) => !keepBook1.includes(field))

      for (const field of fieldsToKeepFromBook2) {
        switch (field) {
          case 'title':
            if (book2.title) book1.title = book2.title
            break
          case 'subtitle':
            if (book2.subtitle !== undefined) book1.subtitle = book2.subtitle
            break
          case 'summary':
            if (book2.summary !== undefined) book1.summary = book2.summary
            break
          case 'description':
            if (book2.description !== undefined) book1.description = book2.description
            break
          case 'image':
            if (book2.image !== undefined) book1.image = book2.image
            break
          case 'language':
            if (book2.language !== undefined) book1.language = book2.language
            break
          case 'copyright':
            if (book2.copyright !== undefined) book1.copyright = book2.copyright
            break
          case 'pages':
            if (book2.pages !== undefined) book1.pages = book2.pages
            break
          case 'duration':
            if (book2.duration !== undefined) book1.duration = book2.duration
            break
          case 'releasedAt':
            if (book2.releasedAt !== undefined) book1.releasedAt = book2.releasedAt
            break
          case 'isExplicit':
            book1.isExplicit = book2.isExplicit
            break
          case 'isAbridged':
            if (book2.isAbridged !== undefined) book1.isAbridged = book2.isAbridged
            break
          case 'type':
            book1.type = book2.type
            break
          case 'publisher':
            if (book2.publisher_id !== undefined) book1.publisher_id = book2.publisher_id
            break
        }
      }

      const allFields = [
        'title',
        'subtitle',
        'summary',
        'description',
        'image',
        'language',
        'copyright',
        'pages',
        'duration',
        'releasedAt',
        'isExplicit',
        'isAbridged',
        'type',
        'publisher',
      ]

      for (const field of allFields) {
        if (!keepBook1.includes(field) && !keepBook2.includes(field)) {
          switch (field) {
            case 'isExplicit':
              book1.isExplicit = false
              break
            case 'type':
              book1.type = 'audiobook'
              break
            case 'subtitle':
              book1.subtitle = null
              break
            case 'summary':
              book1.summary = null
              break
            case 'description':
              book1.description = null
              break
            case 'image':
              book1.image = null
              break
            case 'language':
              book1.language = null
              break
            case 'copyright':
              book1.copyright = null
              break
            case 'pages':
              book1.pages = null
              break
            case 'duration':
              book1.duration = null
              break
            case 'releasedAt':
              book1.releasedAt = null
              break
            case 'isAbridged':
              book1.isAbridged = null
              break
          }
        }
      }

      await trx.from('tracks').where('book_id', book2.id).update({ book_id: book1.id })

      await trx.from('images').where('book_id', book2.id).update({ book_id: book1.id })

      const book2Contributors = await trx
        .from('book_contributor')
        .where('book_id', book2.id)
        .select('contributor_id', 'role', 'type')

      for (const contributor of book2Contributors) {
        const existing = await trx
          .from('book_contributor')
          .where('book_id', book1.id)
          .where('contributor_id', contributor.contributor_id)
          .where('type', contributor.type)
          .first()

        if (!existing) {
          await trx.table('book_contributor').insert({
            book_id: book1.id,
            contributor_id: contributor.contributor_id,
            role: contributor.role,
            type: contributor.type,
            created_at: new Date(),
            updated_at: new Date(),
          })
        }
      }

      await trx.from('book_contributor').where('book_id', book2.id).delete()

      const book2Genres = await trx.from('book_genre').where('book_id', book2.id).select('genre_id')

      for (const genre of book2Genres) {
        const existing = await trx
          .from('book_genre')
          .where('book_id', book1.id)
          .where('genre_id', genre.genre_id)
          .first()

        if (!existing) {
          await trx.table('book_genre').insert({
            book_id: book1.id,
            genre_id: genre.genre_id,
            created_at: new Date(),
            updated_at: new Date(),
          })
        }
      }

      await trx.from('book_genre').where('book_id', book2.id).delete()

      const book2Identifiers = await trx
        .from('book_identifier')
        .where('book_id', book2.id)
        .select('identifier_id')

      for (const identifier of book2Identifiers) {
        const existing = await trx
          .from('book_identifier')
          .where('book_id', book1.id)
          .where('identifier_id', identifier.identifier_id)
          .first()

        if (!existing) {
          await trx.table('book_identifier').insert({
            book_id: book1.id,
            identifier_id: identifier.identifier_id,
            created_at: new Date(),
            updated_at: new Date(),
          })
        }
      }

      await trx.from('book_identifier').where('book_id', book2.id).delete()

      const book2Series = await trx
        .from('book_series')
        .where('book_id', book2.id)
        .select('series_id', 'position')

      for (const series of book2Series) {
        const existing = await trx
          .from('book_series')
          .where('book_id', book1.id)
          .where('series_id', series.series_id)
          .first()

        if (!existing) {
          await trx.table('book_series').insert({
            book_id: book1.id,
            series_id: series.series_id,
            position: series.position,
            created_at: new Date(),
            updated_at: new Date(),
          })
        }
      }

      await trx.from('book_series').where('book_id', book2.id).delete()

      await book1.useTransaction(trx).save()

      await book2.useTransaction(trx).delete()

      await trx.commit()

      const mergedBook = await Book.query()
        .where('id', book1.id)
        .withScopes((s) => s.fullAll())
        .firstOrFail()

      return mergedBook
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
