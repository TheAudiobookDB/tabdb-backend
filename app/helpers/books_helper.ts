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
} from '#validators/crud_validator'
import { TransactionClient } from '@adonisjs/lucid/build/src/transaction_client/index.js'
import db from '@adonisjs/lucid/services/db'
import { TrackType } from '../enum/track_enum.js'

export class BooksHelper {
  static async addGenreToBook(book: Book, genres?: Infer<typeof addIdValidator>[]) {
    if (!genres || genres.length === 0) return
    const genresModel = await Genre.findManyBy('public_id', genres)

    if (genres.length === 0) throw Error('No valid genres were supplied')

    book.$pushRelated('genres', genresModel)
    await book.related('genres').saveMany(genresModel)
  }

  static async addContributorToBook(
    book: Book,
    contributors?: Infer<typeof addContributorValidator>[]
  ) {
    if (!contributors || contributors.length === 0) return

    const roles: Record<number, ModelObject> = {}
    const duplicateContributors: Record<number, ModelObject>[] = []

    if (!book.contributors) {
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

    const narratorModels = await Contributor.query().whereIn(
      'public_id',
      contributors.map((contributor) => contributor.id)
    )

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

    await book.related('contributors').attach(roles)

    if (duplicateContributors) {
      for (const duplicate of duplicateContributors) {
        //await book.related('contributors').detach(duplicate)
        await book.related('contributors').attach(duplicate)
      }
    }
  }

  static async addSeriesToBook(book: Book, payloadObject?: Infer<typeof addSeriesValidator>[]) {
    if (!payloadObject || payloadObject.length === 0) return

    const positions: Record<string, ModelObject> = {}

    const seriesModels = await Series.query().whereIn(
      'public_id',
      payloadObject.map((serie) => serie.id)
    )

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

    const publisherModel = await Publisher.findByOrFail('public_id', publisher.id)

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
      bookId: number
    }> = []

    for (const track of tracks) {
      if (track.id) {
        existingTracks.push(track)
      } else {
        toCreateTracks.push({
          name: track.name!,
          start: track.start!,
          end: track.end!,
          type: track.type! as TrackType,
          bookId: book.id,
        })
      }
    }

    const trackModels = await Track.query().whereIn(
      'public_id',
      existingTracks.map((track) => track.id as string)
    )

    if (!trackModels || trackModels.length !== existingTracks.length) {
      throw Error('At least one of the provided tracks does not exist')
    }

    const trx = await db.transaction()

    trackModels.push(
      ...(await Track.createMany(toCreateTracks, {
        client: trx as TransactionClient,
      }))
    )
  }
}
