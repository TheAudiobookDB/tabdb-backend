import vine from '@vinejs/vine'
import { languageValidation, limitValidation, nanoIdValidation, pageValidation } from '#config/app'
import { isLanguageRule } from '#start/rules/language'
import { ContributorType } from '../enum/contributor_enum.js'

export const asinValidation = vine
  .string()
  .regex(RegExp('^[0-9a-zA-Z]{10}$|^[0-9]{11,12}$'))
  .transform((value) => value.toUpperCase())

export const imageValidation = vine.file({
  size: '3mb',
  extnames: ['jpg', 'jpeg', 'png', 'webp'],
})

export const contributorTypeValidation = vine
  .number()
  .parse((value) => {
    console.log('value', value, typeof value)
    console.log('value', value, typeof value)
    console.log('value', value, typeof value)
    console.log('value', value, typeof value)
    console.log('value', value, typeof value)
    console.log('value', value, typeof value)
    if (typeof value === 'number' || typeof value === 'string') {
      if (typeof value === 'string') {
        value = Number.parseInt(value)
      }
      if (typeof value === 'number' && value in ContributorType) {
        return value
      }
    }
    const allowedTypes = Object.values(ContributorType).map((type) => type.toString())
    throw new Error(`Invalid type. Allowed types are: ${allowedTypes.join(', ')}`)
  })
  .min(1)
  .max(99)
  .withoutDecimals()

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
    language: vine.string().use(isLanguageRule({})).optional(),
    publisher: vine.string().maxLength(1023).optional(),
    releaseDate: vine.string().optional(),
    series: vine
      .array(
        vine.object({
          asin: asinValidation,
          name: vine.string().minLength(1).maxLength(255),
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
        extra: vine.string().optional(),
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
        extra: vine.string().optional(),
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
        extra: vine.string().optional(),
      })
    ),
  ])
  .otherwise((_, field) => {
    field.report('Invalid type or format', 'invalid_identifier', field)
  })

export const identifierValidator = vine.compile(identifierValidation)

export const contributorValidation = vine.object({
  id: nanoIdValidation.optional().requiredIfMissing('name'),
  name: vine.string().minLength(3).maxLength(255).optional().requiredIfMissing('id'),
  description: vine.string().optional(),
  image: imageValidation.optional(),
  role: vine.string().maxLength(255).optional(),
  birthdate: vine.date().optional(),
  country: vine.string().maxLength(2).minLength(2).optional(),
  website: vine.string().url().optional(),
  type: contributorTypeValidation,
  identifiers: vine.array(identifierValidation).maxLength(10).optional(),
})
export const contributorValidator = vine.compile(contributorValidation)

export const publisherValidation = vine.object({
  id: nanoIdValidation.optional().requiredIfMissing('name'),
  name: vine.string().minLength(3).maxLength(255).optional().requiredIfMissing('id'),
  description: vine.string().optional(),
})
export const publisherValidator = vine.compile(publisherValidation)

export const seriesValidation = vine.object({
  id: nanoIdValidation.optional().requiredIfMissing('name'),
  name: vine.string().minLength(3).maxLength(255).optional().requiredIfMissing('id'),
  description: vine.string().optional(),
  image: imageValidation.optional(),
  position: vine.string().optional(),
  language: languageValidation.optional(),
  identifiers: vine.array(identifierValidation).maxLength(5).optional(),
})
export const seriesValidator = vine.compile(seriesValidation)

export const genreValidation = vine.object({
  id: nanoIdValidation.optional().requiredIfAnyMissing(['name', 'type']),
  name: vine.string().minLength(3).maxLength(255).optional().requiredIfMissing('id'),
  type: vine.enum(['genre', 'tag']).optional().requiredIfMissing('id'),
})
export const genreValidator = vine.compile(genreValidation)

export const trackValidation = vine.object({
  id: nanoIdValidation.optional().requiredIfAnyMissing(['name', 'start', 'end']),
  name: vine.string().minLength(3).maxLength(255).optional().requiredIfMissing('id'),
  start: vine.number().positive().optional().requiredIfExists('end').requiredIfMissing('id'),
  end: vine.number().positive().optional().requiredIfExists('start').requiredIfMissing('id'),
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
    series: vine.array(vine.string().minLength(1).maxLength(255)).optional(),
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

export const typeValidation = vine.enum(['book', 'audiobook', 'podcast', 'e-book'])

export const getIdValidator = vine.compile(
  vine.object({
    id: nanoIdValidation,
  })
)

export const getIdPaginationValidator = vine.compile(
  vine.object({
    id: nanoIdValidation,
    page: pageValidation,
    limit: limitValidation,
  })
)
