import vine from '@vinejs/vine'
import { nanoIdValidation } from '#config/app'

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
