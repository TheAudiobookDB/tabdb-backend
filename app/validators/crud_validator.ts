import vine from '@vinejs/vine'
import { languageValidation, nanoIdValidation } from '#config/app'
import {
  contributorTypeValidation,
  imageValidation,
  typeValidation,
} from '#validators/provider_validator'

export const confirmValidation = vine.compile(
  vine.object({
    id: nanoIdValidation,
    signature: vine.string(),
  })
)

// Add - Internal

export const addContributorValidator = vine.object({
  id: nanoIdValidation,
  type: contributorTypeValidation,
  role: vine.string().optional(),
})

export const addSeriesValidator = vine.object({
  id: nanoIdValidation,
  position: vine.string().optional(),
})

export const addIdValidator = vine.object({
  id: nanoIdValidation,
})

export const placeholderIdentifierValidator = vine.object({
  type: vine.enum(['isbn', 'asin', 'ean']),
  value: vine.string().minLength(2).maxLength(255),
  extra: vine.string().optional(),
})

// Create

export const createUpdateBookValidation = vine.compile(
  vine.object({
    title: vine.string().minLength(2).maxLength(1023).optional().requiredIfMissing('logId'),
    subtitle: vine.string().minLength(2).maxLength(1023).optional(),
    description: vine.string().minLength(2).maxLength(20000).optional(),
    summary: vine.string().minLength(2).maxLength(10000).optional(),
    publisher: addIdValidator.optional(),
    language: languageValidation.optional(),
    copyright: vine.string().maxLength(255).optional(),
    pages: vine.number().positive().withoutDecimals().optional(),
    duration: vine.number().positive().optional(),
    releasedAt: vine.date().optional(),
    isExplicit: vine.boolean().optional(),
    isAbridged: vine.boolean().optional(),
    groupId: vine.number().positive().withoutDecimals().optional(),
    image: imageValidation.optional(),
    type: typeValidation.optional(),
    genres: vine.array(addIdValidator).maxLength(30).optional(),
    contributors: vine.array(addContributorValidator).maxLength(50).optional(),
    identifiers: vine.array(placeholderIdentifierValidator).maxLength(10).optional(),
    series: vine.array(addSeriesValidator).maxLength(10).optional(),
    tracks: vine.array(addIdValidator).maxLength(2000).optional(),
    logId: nanoIdValidation.optional().requiredIfMissing('title'),
  })
)

export const createUpdateContributorValidation = vine.compile(
  vine.object({
    name: vine.string().minLength(3).maxLength(255),
    image: imageValidation.optional(),
    identifiers: vine.array(placeholderIdentifierValidator).maxLength(10).optional(),
    country: vine.string().maxLength(2).optional(),
    description: vine.string().maxLength(10000).optional(),
    website: vine.string().maxLength(255).optional(),
    birthDate: vine.date().optional(),
    logId: nanoIdValidation.optional().requiredIfMissing('name'),
  })
)

export const createGenreValidation = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(255),
    type: vine.enum(['genre', 'tag']),
  })
)

export const createPublisherValidation = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(255),
    description: vine.string().maxLength(10000).optional(),
  })
)

export const createSeriesValidation = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(255),
    image: imageValidation.optional(),
    description: vine.string().maxLength(10000).optional(),
    identifiers: vine.array(placeholderIdentifierValidator).maxLength(10).optional(),
  })
)
