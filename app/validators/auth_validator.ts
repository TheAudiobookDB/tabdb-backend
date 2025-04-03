import vine from '@vinejs/vine'

export const storeLoginValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
  })
)
