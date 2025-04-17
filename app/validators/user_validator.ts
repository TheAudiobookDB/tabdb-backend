import vine from '@vinejs/vine'
import { imageValidation } from '#validators/provider_validator'

export const updateUserValidator = vine.compile(
  vine.object({
    fullName: vine.string().minLength(4).maxLength(255).optional(),
    email: vine.string().email().optional(),
    avatar: imageValidation.optional(),
    username: vine
      .string()
      .minLength(4)
      .maxLength(255)
      .regex(new RegExp('^[a-z0-9_]+$'))
      .optional(),
  })
)
