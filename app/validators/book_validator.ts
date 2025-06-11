import vine from '@vinejs/vine'
import { nanoIdValidation } from '#config/app'

/**
 *
 */

export const getBookValidator = vine.compile(
  vine.object({
    id: nanoIdValidation,
  })
)
