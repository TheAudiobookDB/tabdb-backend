import vine from '@vinejs/vine'
import { nanoIdValidation } from '#config/app'
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

export const idsValidation = vine
  .array(nanoIdValidation)
  .minLength(1)
  .maxLength(50)
  .parse((v) => {
    if (typeof v === 'string') {
      return [v]
    }
    return v
  })

export const getIdsValidator = vine.compile(
  vine.object({
    ids: idsValidation,
  })
)
