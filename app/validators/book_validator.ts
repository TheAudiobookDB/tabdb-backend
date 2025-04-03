import vine from '@vinejs/vine'

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
    type: vine.enum(['book', 'audiobook', 'podcast']).optional(),
    genres: vine
      .array(
        vine.object({
          name: vine.string().minLength(3).maxLength(255),
          type: vine.enum(['genre', 'tag']),
        })
      )
      .optional(),
    authors: vine
      .array(
        vine.object({
          name: vine.string().minLength(3).maxLength(255),
          description: vine.string().optional(),
          image: vine.string().url().optional(),
        })
      )
      .optional(),
    narrators: vine
      .array(
        vine.object({
          name: vine.string().minLength(3).maxLength(255),
          description: vine.string().optional(),
          image: vine.string().url().optional(),
        })
      )
      .optional(),
    identifiers: vine
      .array(
        vine.object({
          type: vine.enum(['audible:asin', 'amazon:asin', 'isbn10', 'isbn13', 'ean']),
          value: vine.string().minLength(3).maxLength(255),
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
