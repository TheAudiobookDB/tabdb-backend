import vine from '@vinejs/vine'
import { nanoIdValidation } from '#config/app'

export const audiMetaBookValidator = vine.compile(
  vine.object({
    asin: vine.string().minLength(10).maxLength(10),
    title: vine.string().maxLength(1023),
    subtitle: vine.string().maxLength(1023).optional(),
    copyright: vine.string().maxLength(1023).optional(),
    description: vine.string().optional(),
    summary: vine.string().optional(),
    bookFormat: vine.enum(['abridged', 'unabridged']).optional(),
    lengthMinutes: vine.number().positive().withoutDecimals().optional(),
    imageUrl: vine.string().url().optional(),
    explicit: vine.boolean().optional(),
    isbn: vine.string().minLength(10).maxLength(13).optional(),
    language: vine.string().maxLength(255).optional(),
    publisher: vine.string().maxLength(1023).optional(),
    releaseDate: vine.string().optional(),
    series: vine
      .array(
        vine.object({
          asin: vine.string().minLength(10).maxLength(10),
          name: vine.string().minLength(3).maxLength(255),
          position: vine.string().minLength(1).maxLength(255).optional(),
        })
      )
      .optional(),
    authors: vine
      .array(
        vine.object({
          asin: vine.string().minLength(10).maxLength(10),
          name: vine.string().minLength(3).maxLength(255),
        })
      )
      .optional(),
    narrators: vine
      .array(
        vine.object({
          name: vine.string().minLength(3).maxLength(255),
        })
      )
      .optional(),
    genres: vine
      .array(
        vine.object({
          asin: vine.string().minLength(10).maxLength(11),
          name: vine.string().minLength(3).maxLength(255),
          type: vine
            .enum(['Genres', 'Tags'])
            .optional()
            .transform((value) => {
              if (value === 'Genres') {
                return 'genre'
              } else if (value === 'Tags') {
                return 'tag'
              }
              return value
            }),
        })
      )
      .optional(),
  })
)

export const audiMetaAuthorValidator = vine.compile(
  vine.object({
    asin: vine.string().minLength(10).maxLength(11),
    name: vine.string().minLength(3).maxLength(255),
    description: vine.string().optional(),
    image: vine.string().url().optional(),
  })
)

export const audiMetaTrackValidator = vine.compile(
  vine.object({
    brandIntroDurationMs: vine.number().positive().optional(),
    brandOutroDurationMs: vine.number().positive().optional(),
    is_accurate: vine.boolean().optional(),
    runtime_length_ms: vine.number().positive().optional(),
    runtime_length: vine.string().optional(),
    chapters: vine.array(
      vine.object({
        title: vine.string().minLength(3).maxLength(255),
        startOffsetMs: vine.number().positive(),
        startOffsetSec: vine.number().positive().optional(),
        lengthMs: vine.number().positive(),
      })
    ),
  })
)

export const audiMetaSeriesValidator = vine.compile(
  vine.object({
    asin: vine.string().minLength(10).maxLength(11),
    title: vine.string().minLength(3).maxLength(255),
    description: vine.string().optional(),
  })
)

export const identifierValidation = vine
  .union([
    vine.union.if(
      (value) => vine.helpers.isObject(value) && 'id' in value,
      vine.object({
        id: nanoIdValidation,
      })
    ),
    vine.union.if(
      (value) =>
        vine.helpers.isObject(value) &&
        'value' in value &&
        'type' in value &&
        vine.helpers.isString(value.type) &&
        value.type.includes('asin') &&
        !('id' in value),
      vine.object({
        type: vine.enum(['audible:asin', 'amazon:asin']),
        value: vine.string().regex(RegExp('^[0-9A-Z]{10,11}$')),
      })
    ),
    vine.union.if(
      (value) =>
        vine.helpers.isObject(value) &&
        'value' in value &&
        'type' in value &&
        vine.helpers.isString(value.type) &&
        value.type.includes('isbn10') &&
        !('id' in value),
      vine.object({
        type: vine.enum(['isbn10']),
        value: vine.string().regex(RegExp('^\\d{9}[\\dX]$')),
      })
    ),
    vine.union.if(
      (value) =>
        vine.helpers.isObject(value) &&
        'value' in value &&
        'type' in value &&
        vine.helpers.isString(value.type) &&
        (value.type.includes('isbn13') || value.type.includes('ean')) &&
        !('id' in value),
      vine.object({
        type: vine.enum(['isbn13', 'ean']),
        value: vine.string().regex(RegExp('^\\d{13}$')),
      })
    ),
  ])
  .otherwise((_, field) => {
    field.report('Invalid type or format', 'invalid_identifier', field)
  })

export const identifierValidator = vine.compile(identifierValidation)

export const narratorValidation = vine.object({
  id: nanoIdValidation.optional().requiredIfMissing('name'),
  name: vine.string().minLength(3).maxLength(255).optional().requiredIfMissing('id'),
  description: vine.string().optional(),
  image: vine.string().url().optional(),
  role: vine.string().maxLength(255).optional(),
  identifiers: vine.array(identifierValidation).optional(),
})
export const narratorValidator = vine.compile(narratorValidation)

const authorValidation = vine.object({
  id: nanoIdValidation.optional().requiredIfMissing('name'),
  name: vine.string().minLength(3).maxLength(255).optional().requiredIfMissing('id'),
  description: vine.string().optional(),
  image: vine.string().url().optional(),
  identifiers: vine.array(identifierValidation).optional(),
})
export const authorValidator = vine.compile(authorValidation)

export const seriesValidation = vine.object({
  id: nanoIdValidation.optional().requiredIfMissing('name'),
  name: vine.string().minLength(3).maxLength(255).optional().requiredIfMissing('id'),
  description: vine.string().optional(),
  image: vine.string().url().optional(),
  position: vine.string().optional(),
  identifiers: vine.array(identifierValidation).optional(),
})
export const seriesValidator = vine.compile(seriesValidation)

const genreValidation = vine.object({
  id: nanoIdValidation.optional().requiredIfMissing('name'),
  name: vine.string().minLength(3).maxLength(255).optional().requiredIfMissing('id'),
  type: vine.enum(['genre', 'tag']).optional().requiredIfMissing('id'),
})
export const genreValidator = vine.compile(genreValidation)

export const trackValidation = vine.object({
  id: nanoIdValidation.optional().requiredIfMissing('name'),
  name: vine.string().minLength(3).maxLength(255).optional().requiredIfMissing('id'),
  start: vine.number().positive().optional().requiredIfExists('end'),
  end: vine.number().positive().optional().requiredIfExists('start'),
})
export const trackValidator = vine.compile(trackValidation)
