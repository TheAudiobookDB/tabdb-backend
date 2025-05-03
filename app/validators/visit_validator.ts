import vine from '@vinejs/vine'
import { languageValidation, limitValidation, nanoIdValidation, pageValidation } from '#config/app'
import { contributorTypeValidation } from '#validators/provider_validator'

export const visitBookValidator = vine.compile(
  vine.object({
    page: pageValidation,
    limit: limitValidation,
    genre: nanoIdValidation.optional(),
    contributor: nanoIdValidation.optional().requiredIfExists('contributorType'),
    contributorType: contributorTypeValidation.optional(),
    language: languageValidation.optional(),
  })
)
