import vine from '@vinejs/vine'
import { imageCRUDValidation } from '#validators/crud_validator'

export const updateUserValidator = vine.compile(
  vine.object({
    fullName: vine.string().minLength(4).maxLength(255).optional(),
    email: vine.string().email().optional(),
    avatar: imageCRUDValidation.optional(),
    username: vine
      .string()
      .minLength(4)
      .maxLength(255)
      .regex(new RegExp('^[a-z0-9_.-]+$'))
      .optional(),
  })
)
