import vine from '@vinejs/vine'
import { languageValidation, limitValidation, nanoIdValidation, pageValidation } from '#config/app'
import { contributorTypeValidation } from '#validators/provider_validator'
import { DateTime } from 'luxon'

export const visitBookValidator = vine.compile(
  vine.object({
    page: pageValidation,
    limit: limitValidation,
    fromDate: vine.date().parse((p) => {
      if (!p) {
        return undefined
      }
      try {
        const parsedDate = typeof p === 'string' ? DateTime.fromISO(p) : p
        if (parsedDate instanceof DateTime) {
          const now = DateTime.now()
          if (parsedDate > now) {
            return
          }
          if (parsedDate < now.minus({ years: 1 })) {
            return
          }
          if (parsedDate > now.minus({ weeks: 1 })) {
            return
          }
        }
        return p
      } catch (_) {
        console.log()
        return undefined
      }
    }),
    genre: nanoIdValidation.optional(),
    contributor: nanoIdValidation.optional().requiredIfExists('contributorType'),
    contributorType: contributorTypeValidation.optional(),
    publisher: nanoIdValidation.optional(),
    language: languageValidation.optional(),
  })
)
