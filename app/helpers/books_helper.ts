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
} from '#validators/crud_validator'

export class BooksHelper {
  static async addGenreToBook(book: Book, genres?: Infer<typeof addIdValidator>[]) {
    if (!genres || genres.length === 0) return
    const genresModel = await Genre.findManyBy('public_id', genres)

    if (genres.length === 0) throw Error('No valid genres were supplied')

    book.$pushRelated('genres', genresModel)
    await book.related('genres').saveMany(genresModel)
  }

  // TODO: Drop contributors not in the list
  static async addContributorToBook(
    book: Book,
    contributors?: Infer<typeof addContributorValidator>[]
  ) {
    if (!contributors || contributors.length === 0) return

    if (!book.contributors) {
      await book.load('contributors', (q) => q.pivotColumns(['role', 'type']))
    }

    const existingCombinations = new Set<string>()

    if (book.contributors && book.contributors.length > 0) {
      for (const contributor of book.contributors) {
        const type = contributor.$extras.pivot_type
        const role = contributor.$extras.pivot_role || ''
        existingCombinations.add(`${contributor.id}-${type}-${role}`)
      }
    }

    const contributorModels = await Contributor.query().whereIn(
      'public_id',
      contributors.map((contributor) => contributor.id)
    )

    if (contributorModels.length === 0) {
      throw new Error('No valid contributors were supplied')
    }

    for (const contributor of contributors) {
      const contributorModel = contributorModels.find((model) => model.publicId === contributor.id)

      if (!contributorModel) continue

      const role = contributor.role || ''
      const type = contributor.type
      const combinationKey = `${contributorModel.id}-${type}-${role}`

      if (existingCombinations.has(combinationKey)) {
        console.log(
          `Skipping duplicate combination: contributor ${contributorModel.id}, type ${type}, role ${role}`
        )
        continue
      }

      const pivotData: any = { type }
      if (role) {
        pivotData.role = role
      }

      await book.related('contributors').attach({
        [contributorModel.id]: pivotData,
      })

      existingCombinations.add(combinationKey)
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
}
