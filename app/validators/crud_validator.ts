import vine from '@vinejs/vine'
import { languageValidation, nanoIdValidation } from '#config/app'
import {
  contributorTypeValidation,
  imageValidation,
  typeValidation,
} from '#validators/provider_validator'
import { TrackType } from '../enum/track_enum.js'
import { IdentifierType } from '../enum/identifier_enum.js'

export const confirmValidation = vine.compile(
  vine.object({
    id: nanoIdValidation,
    signature: vine.string(),
  })
)

export const imageCRUDValidation = vine
  .string()
  .regex(new RegExp('^[a-z0-9]{16}$'))
  .minLength(16)
  .maxLength(16)

export const allowedIdentifiers = Object.values(IdentifierType)

export const placeholderIdentifierValidator = vine.object({
  id: nanoIdValidation.optional().requiredIfAnyMissing(['type', 'value']),
  type: vine.enum(allowedIdentifiers).optional().requiredIfMissing('value'),
  value: vine.string().minLength(2).maxLength(255).optional().requiredIfMissing('type'),
  extra: vine.string().optional().requiredIfMissing('type'),
})

export const identifierOpenAPIValidator = vine.compile(placeholderIdentifierValidator)

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

export const addTrackValidator = vine.object({
  id: nanoIdValidation.optional().requiredIfMissing('name'),
  name: vine.string().optional().requiredIfMissing('id'),
  start: vine.number().positive().withoutDecimals().optional().requiredIfMissing('end'),
  end: vine.number().positive().withoutDecimals().optional().requiredIfMissing('start'),
  type: vine.enum(Object.values(TrackType)).optional().requiredIfMissing('id'),
  contributors: vine.array(addContributorValidator).maxLength(10).optional(),
  image: imageCRUDValidation.optional(),
})

export const addImageValidator = vine.object({
  image: imageValidation,
})

export const addImageValidation = vine.compile(addImageValidator)

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
    image: imageCRUDValidation.optional(),
    type: typeValidation.optional(),
    genres: vine.array(addIdValidator).maxLength(30).optional(),
    contributors: vine.array(addContributorValidator).maxLength(50).optional(),
    identifiers: vine.array(placeholderIdentifierValidator).maxLength(10).optional(),
    series: vine.array(addSeriesValidator).maxLength(10).optional(),
    tracks: vine.array(addTrackValidator).maxLength(2000).optional(),
    logId: nanoIdValidation.optional().requiredIfMissing('title'),
  })
)

export const createUpdateContributorValidation = vine.compile(
  vine.object({
    name: vine.string().minLength(3).maxLength(255),
    image: imageCRUDValidation.optional(),
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
    image: imageCRUDValidation.optional(),
    description: vine.string().maxLength(10000).optional(),
    identifiers: vine.array(placeholderIdentifierValidator).maxLength(10).optional(),
  })
)
