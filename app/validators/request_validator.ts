import vine from '@vinejs/vine'

export const indexRequestValidator = vine.compile(
  vine.object({
    provider: vine.enum(['audible']),
    type: vine.enum(['book', 'author', 'tracks', 'series']),
    identifier: vine.string().trim().minLength(3).maxLength(20),
    language: vine.enum(['de', 'us']),
  })
)
