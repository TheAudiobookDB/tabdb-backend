import vine from '@vinejs/vine'
import { identifierValidation, imageValidation } from '#validators/provider_validator'
import { nanoIdValidation } from '#config/app'

export const contributorCreateValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(3).maxLength(255),
    description: vine.string().optional(),
    image: imageValidation.optional(),
    birthdate: vine.date().optional(),
    country: vine.string().maxLength(2).minLength(2).optional(),
    website: vine.string().url().optional(),
    identifiers: vine.array(identifierValidation).maxLength(10).optional(),
  })
)

export const contributorUpdateValidator = vine.compile(
  vine.object({
    logId: nanoIdValidation.optional().requiredIfMissing('id'),
    id: nanoIdValidation.optional().requiredIfMissing('logId'),
    name: vine.string().minLength(3).maxLength(255).optional(),
    description: vine.string().optional(),
    image: imageValidation.optional(),
    role: vine.string().maxLength(255).optional(),
    birthdate: vine.date().optional(),
    country: vine.string().maxLength(2).minLength(2).optional(),
    website: vine.string().url().optional(),
    identifiers: vine.array(identifierValidation).maxLength(10).optional(),
  })
)
