import vine from '@vinejs/vine'
import { languageValidation, nanoIdValidation } from '#config/app'

export const asinValidation = vine
  .string()
  .regex(RegExp('^[0-9a-zA-Z]{10}$|^[0-9]{11,12}$'))
  .transform((value) => value.toUpperCase())

export const audiMetaBookValidator = vine.compile(
  vine.object({
    asin: vine.string().minLength(10).maxLength(11),
    title: vine.string().maxLength(1023),
    subtitle: vine.string().maxLength(1023).optional(),
    copyright: vine.string().maxLength(1023).optional(),
    description: vine.string().optional(),
    summary: vine.string().optional(),
    bookFormat: vine.enum(['abridged', 'unabridged', 'original_recording']).optional(),
    lengthMinutes: vine.number().positive().withoutDecimals().optional(),
    imageUrl: vine.string().url().optional(),
    explicit: vine.boolean().optional(),
    isbn: vine.string().minLength(10).maxLength(13).optional(),
    language: languageValidation.optional(),
    publisher: vine.string().maxLength(1023).optional(),
    releaseDate: vine.string().optional(),
    series: vine
      .array(
        vine.object({
          asin: asinValidation,
          name: vine.string().minLength(3).maxLength(255),
          position: vine.string().maxLength(255).optional(),
        })
      )
      .optional(),
    authors: vine
      .array(
        vine.object({
          asin: vine.any().transform((value) => {
            if (
              typeof value === 'string' &&
              RegExp('^[0-9a-zA-Z]{10}$|^[0-9]{11,12}$').test(value)
            ) {
              return value
            }
            return null
          }),
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
          asin: asinValidation,
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
    asin: asinValidation,
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
    asin: asinValidation,
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
        value.value &&
        !('id' in value),
      vine.object({
        type: vine.enum(['audible:asin', 'amazon:asin']),
        value: asinValidation,
      })
    ),
    vine.union.if(
      (value) =>
        vine.helpers.isObject(value) &&
        'value' in value &&
        'type' in value &&
        vine.helpers.isString(value.type) &&
        value.type.includes('isbn10') &&
        value.value &&
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
        value.value &&
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

export const audiobookshelfValidator = vine.compile(
  vine.object({
    title: vine.string().minLength(3).maxLength(255),
    subtitle: vine.string().minLength(3).maxLength(255).optional(),
    tags: vine.array(vine.string().minLength(3).maxLength(255)).optional(),
    genres: vine.array(vine.string().minLength(3).maxLength(255)).optional(),
    authors: vine.array(vine.string().minLength(3).maxLength(255)).optional(),
    narrators: vine.array(vine.string().minLength(3).maxLength(255)).optional(),
    series: vine.array(vine.string().minLength(3).maxLength(255)).optional(),
    chapters: vine
      .array(
        vine.object({
          start: vine.number().positive(),
          end: vine.number().positive(),
          title: vine.string().minLength(3).maxLength(255),
        })
      )
      .optional(),
    publishedYear: vine.string().optional(),
    publisher: vine.string().optional(),
    description: vine.string().optional(),
    isbn: vine.string().optional(),
    asin: vine.string().optional(),
    language: vine.string().optional(),
    explicit: vine.boolean().optional(),
    abridged: vine.boolean().optional(),
  })
)
