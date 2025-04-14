import vine from '@vinejs/vine'

export const updateUserValidator = vine.compile(
  vine.object({
    fullName: vine.string().minLength(4).maxLength(255).optional(),
    email: vine.string().email().optional(),
  })
)
