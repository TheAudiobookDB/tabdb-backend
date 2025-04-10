import vine from '@vinejs/vine'
import {
  authorValidation,
  genreValidation,
  identifierValidation,
  narratorValidation,
  seriesValidation,
  trackValidation,
  typeValidation,
} from '#validators/provider_validator'
import { nanoIdValidation, languageValidation } from '#config/app'

/**
 *
 */

export const createBookValidator = vine.compile(
  vine.object({
    title: vine.string().minLength(3).maxLength(1023),
    subtitle: vine.string().minLength(3).maxLength(1023).optional(),
    description: vine.string().optional(),
    summary: vine.string().optional(),
    publisher: vine.string().maxLength(1023).optional(),
    language: languageValidation.optional(),
    copyright: vine.string().maxLength(255).optional(),
    pages: vine.number().positive().withoutDecimals().optional(),
    duration: vine.number().positive().optional(),
    releasedAt: vine.date().optional(),
    isExplicit: vine.boolean().optional(),
    isAbridged: vine.boolean().optional(),
    groupId: vine.number().positive().withoutDecimals().optional(),
    image: vine
      .file({
        size: '1mb',
        extnames: ['jpg', 'jpeg', 'png', 'webp'],
      })
      .optional(),
    type: typeValidation.optional(),
    genres: vine.array(genreValidation).maxLength(30).optional(),
    authors: vine.array(authorValidation).maxLength(20).optional(),
    narrators: vine.array(narratorValidation).maxLength(50).optional(),
    identifiers: vine.array(identifierValidation).maxLength(5).optional(),
    series: vine.array(seriesValidation).maxLength(5).optional(),
    tracks: vine.array(trackValidation).maxLength(2047).optional(),
  })
)

export const getBookValidator = vine.compile(
  vine.object({
    id: nanoIdValidation,
  })
)
