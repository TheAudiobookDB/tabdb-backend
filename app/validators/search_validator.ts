import vine from '@vinejs/vine'
import { languageValidation, limitValidation, pageValidation } from '#config/app'

export const sortByValidation = vine
  .array(
    vine.enum([
      'title',
      '-title',
      'releasedAt',
      '-releasedAt',
      'type',
      'duration',
      '-duration',
      'pages',
      '-pages',
      'language',
      'random',
    ])
  )
  .parse((v) => {
    if (typeof v === 'string') {
      return [v]
    }
    return v
  })
  .maxLength(3)
  .optional()

export const sortByMiniValidation = vine
  .array(vine.enum(['random']))
  .parse((v) => {
    if (typeof v === 'string') {
      return [v]
    }
    return v
  })
  .maxLength(3)
  .optional()

export const thresholdValidation = vine
  .number()
  .min(0.25)
  .max(1)
  .optional()
  .transform((val) => val ?? 0.35)

export const searchBookValidation = vine.object({
  title: vine.string().trim().minLength(3).maxLength(1023).optional(),
  subtitle: vine.string().trim().minLength(3).maxLength(1023).optional(),
  author: vine.string().trim().minLength(3).maxLength(1023).optional(),
  narrator: vine.string().trim().minLength(3).maxLength(1023).optional(),
  keywords: vine.string().trim().minLength(3).maxLength(1023).optional(),
  publisher: vine.string().trim().maxLength(1023).optional(),
  language: languageValidation.optional(),
  genre: vine.string().trim().maxLength(255).optional(),
  series: vine.string().trim().maxLength(255).optional(),
  releasedAfter: vine.date().optional(),
  releasedBefore: vine.date().optional(),
  isExplicit: vine.boolean().optional(),
  isAbridged: vine.boolean().optional(),
  type: vine.enum(['book', 'audiobook', 'podcast', 'e-book']).optional(),
  sort: sortByValidation,
  page: pageValidation,
  limit: limitValidation,
  threshold: thresholdValidation,
})

export const searchBookValidator = vine.compile(searchBookValidation)

const createSearchValidator = vine.object({
  name: vine.string().trim().minLength(3).maxLength(1023).optional(),
  keywords: vine.string().trim().minLength(3).maxLength(1023).optional(),
  page: pageValidation,
  limit: limitValidation,
  threshold: thresholdValidation,
  sort: sortByMiniValidation,
  language: languageValidation.optional(),
})

export const searchContributorValidator = vine.compile(createSearchValidator)
export const searchSeriesValidator = vine.compile(createSearchValidator)

export const searchGenreValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(1023).optional(),
    type: vine.enum(['genre', 'tag']).optional(),
    page: pageValidation,
    limit: limitValidation,
    threshold: thresholdValidation,
    sort: sortByMiniValidation,
  })
)
