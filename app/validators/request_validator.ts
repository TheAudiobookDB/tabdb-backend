import vine from '@vinejs/vine'

export const indexRequestValidator = vine.compile(
  vine.object({
    provider: vine.enum(['audible']),
    type: vine.enum(['book', 'author', 'tracks', 'series', 'narrator']),
    identifier: vine.string().trim().minLength(3).maxLength(20),
    data: vine.enum(['us', 'ca', 'uk', 'au', 'fr', 'de', 'jp', 'it', 'in', 'es', 'br']),
  })
)
