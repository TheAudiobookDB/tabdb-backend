import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Book from '#models/book'
import Track from '#models/track'
import User from '#models/user'

export class CascadingSoftDeleteHelper {
  static async deleteBook(book: Book): Promise<void> {
    const trx = await db.transaction()

    try {
      await trx.from('tracks').where('book_id', book.id).update({
        deleted_at: DateTime.now().toSQL(),
      })

      await trx.from('images').where('book_id', book.id).whereNull('track_id').update({
        deleted_at: DateTime.now().toSQL(),
      })

      await trx
        .from('images')
        .whereIn('track_id', trx.from('tracks').select('id').where('book_id', book.id))
        .update({
          deleted_at: DateTime.now().toSQL(),
        })

      book.deletedAt = DateTime.now()
      book.useTransaction(trx)
      await book.save()

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  static async deleteTrack(track: Track): Promise<void> {
    const trx = await db.transaction()

    try {
      await trx.from('images').where('track_id', track.id).update({
        deleted_at: DateTime.now().toSQL(),
      })

      await trx.from('tracks').where('parent', track.id).update({
        deleted_at: DateTime.now().toSQL(),
      })

      track.deletedAt = DateTime.now()
      track.useTransaction(trx)
      await track.save()

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  static async deleteOrphanedImages(): Promise<number> {
    const trx = await db.transaction()

    try {
      const orphanedBookImages = await trx
        .from('images')
        .whereNotNull('book_id')
        .whereNull('deleted_at')
        .whereIn('book_id', trx.from('books').select('id').whereNotNull('deleted_at'))

      const orphanedTrackImages = await trx
        .from('images')
        .whereNotNull('track_id')
        .whereNull('deleted_at')
        .whereIn('track_id', trx.from('tracks').select('id').whereNotNull('deleted_at'))

      const totalOrphaned = orphanedBookImages.length + orphanedTrackImages.length

      if (totalOrphaned > 0) {
        await trx
          .from('images')
          .whereNotNull('book_id')
          .whereNull('deleted_at')
          .whereIn('book_id', trx.from('books').select('id').whereNotNull('deleted_at'))
          .update({
            deleted_at: DateTime.now().toSQL(),
          })

        await trx
          .from('images')
          .whereNotNull('track_id')
          .whereNull('deleted_at')
          .whereIn('track_id', trx.from('tracks').select('id').whereNotNull('deleted_at'))
          .update({
            deleted_at: DateTime.now().toSQL(),
          })
      }

      await trx.commit()
      return totalOrphaned
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  static async deleteUser(user: User, deleteContributions: boolean = false): Promise<void> {
    const trx = await db.transaction()

    try {
      if (deleteContributions) {
        await trx.from('logs').where('user_id', user.id).update({
          deleted_at: DateTime.now().toSQL(),
        })
      }

      user.deletedAt = DateTime.now()
      user.useTransaction(trx)
      await user.save()

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  static async cleanupUnusedEntities(): Promise<{
    contributors: number
    series: number
    genres: number
    publishers: number
  }> {
    const trx = await db.transaction()

    try {
      const unusedContributors = await trx
        .from('contributors')
        .whereNull('deleted_at')
        .whereNotExists(
          trx
            .from('book_contributors')
            .join('books', 'books.id', 'book_contributors.book_id')
            .whereRaw('book_contributors.contributor_id = contributors.id')
            .whereNull('books.deleted_at')
        )

      const unusedSeries = await trx
        .from('series')
        .whereNull('deleted_at')
        .whereNotExists(
          trx
            .from('book_series')
            .join('books', 'books.id', 'book_series.book_id')
            .whereRaw('book_series.series_id = series.id')
            .whereNull('books.deleted_at')
        )

      const unusedGenres = await trx
        .from('genres')
        .whereNull('deleted_at')
        .whereNotExists(
          trx
            .from('book_genres')
            .join('books', 'books.id', 'book_genres.book_id')
            .whereRaw('book_genres.genre_id = genres.id')
            .whereNull('books.deleted_at')
        )

      const unusedPublishers = await trx
        .from('publishers')
        .whereNull('deleted_at')
        .whereNotExists(
          trx
            .from('books')
            .whereRaw('books.publisher_id = publishers.id')
            .whereNull('books.deleted_at')
        )

      const counts = {
        contributors: unusedContributors.length,
        series: unusedSeries.length,
        genres: unusedGenres.length,
        publishers: unusedPublishers.length,
      }

      if (counts.contributors > 0) {
        await trx
          .from('contributors')
          .whereIn(
            'id',
            unusedContributors.map((c) => c.id)
          )
          .update({
            deleted_at: DateTime.now().toSQL(),
          })
      }

      if (counts.series > 0) {
        await trx
          .from('series')
          .whereIn(
            'id',
            unusedSeries.map((s) => s.id)
          )
          .update({
            deleted_at: DateTime.now().toSQL(),
          })
      }

      if (counts.genres > 0) {
        await trx
          .from('genres')
          .whereIn(
            'id',
            unusedGenres.map((g) => g.id)
          )
          .update({
            deleted_at: DateTime.now().toSQL(),
          })
      }

      if (counts.publishers > 0) {
        await trx
          .from('publishers')
          .whereIn(
            'id',
            unusedPublishers.map((p) => p.id)
          )
          .update({
            deleted_at: DateTime.now().toSQL(),
          })
      }

      await trx.commit()
      return counts
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  static async restoreBook(book: Book): Promise<void> {
    const trx = await db.transaction()

    try {
      book.deletedAt = null
      book.useTransaction(trx)
      await book.save()

      await trx.from('tracks').where('book_id', book.id).whereNotNull('deleted_at').update({
        deleted_at: null,
      })

      await trx
        .from('images')
        .where((builder) => {
          builder
            .where('book_id', book.id)
            .orWhereIn('track_id', trx.from('tracks').select('id').where('book_id', book.id))
        })
        .whereNotNull('deleted_at')
        .update({
          deleted_at: null,
        })

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
