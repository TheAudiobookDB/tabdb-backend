import vine from '@vinejs/vine'

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
    language: vine.string().maxLength(255).optional(),
    copyright: vine.string().maxLength(255).optional(),
    pages: vine.number().positive().withoutDecimals().optional(),
    duration: vine.number().positive().optional(),
    publishedAt: vine.date().optional(),
    releasedAt: vine.date().optional(),
    isExplicit: vine.boolean().optional(),
    isAbridged: vine.boolean().optional(),
    groupId: vine.number().positive().withoutDecimals().optional(),
    type: vine.enum(['book', 'audiobook', 'podcast']).optional(),
    genres: vine
      .array(
        vine.object({
          id: vine
            .number()
            .positive()
            .withoutDecimals()
            .optional()
            .requiredIfAnyMissing(['name', 'type']),
          name: vine.string().minLength(3).maxLength(255).optional().requiredIfMissing('id'),
          type: vine.enum(['genre', 'tag']).optional().requiredIfMissing('id'),
        })
      )
      .optional(),
    authors: vine
      .array(
        vine.object({
          id: vine.number().positive().withoutDecimals().optional().requiredIfMissing('name'),
          name: vine.string().minLength(3).maxLength(255).optional().requiredIfMissing('id'),
          description: vine.string().optional(),
          image: vine.string().url().optional(),
        })
      )
      .optional(),
    narrators: vine
      .array(
        vine.object({
          id: vine.number().positive().withoutDecimals().optional().requiredIfMissing('name'),
          name: vine.string().minLength(3).maxLength(255).optional().requiredIfMissing('id'),
          description: vine.string().optional(),
          image: vine.string().url().optional(),
          role: vine.string().maxLength(255).optional(),
        })
      )
      .optional(),
    identifiers: vine
      .array(
        vine
          .union([
            vine.union.if(
              (value) => vine.helpers.isObject(value) && 'id' in value,
              vine.object({
                id: vine.number().positive().withoutDecimals(),
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
                value: vine.string().regex(RegExp('^[0-9A-Z]{10}$')),
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
      )
      .optional(),
    series: vine
      .array(
        vine.object({
          id: vine.number().positive().withoutDecimals().optional().requiredIfMissing('name'),
          name: vine.string().minLength(3).maxLength(255).optional().requiredIfMissing('id'),
          description: vine.string().optional(),
          image: vine.string().url().optional(),
          position: vine.string().optional(),
        })
      )
      .optional(),
    tracks: vine
      .array(
        vine.object({
          id: vine
            .number()
            .positive()
            .withoutDecimals()
            .optional()
            .requiredIfAnyMissing(['name', 'start', 'end']),
          name: vine.string().minLength(3).maxLength(255).optional().requiredIfMissing('id'),
          start: vine
            .number()
            .positive()
            .optional()
            .requiredIfExists('end')
            .requiredIfMissing('id'),
          end: vine
            .number()
            .positive()
            .optional()
            .requiredIfExists('start')
            .requiredIfMissing('id'),
        })
      )
      .optional(),
  })
)

export const getBookValidator = vine.compile(
  vine.object({
    id: vine.number().positive().withoutDecimals(),
  })
)
