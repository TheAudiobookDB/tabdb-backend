import vine from '@vinejs/vine'

export const storeLoginValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    username: vine
      .string()
      .minLength(4)
      .maxLength(255)
      .regex(new RegExp('^[a-z0-9_.-]*$'))
      .optional(),
  })
)

export const usernameValidator = vine.compile(
  vine.object({
    username: vine.string().minLength(4).maxLength(255).regex(new RegExp('^[a-z0-9_.-]*$')),
  })
)
