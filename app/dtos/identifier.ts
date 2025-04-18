import { BaseModelDto } from '@adocasts.com/dto/base'
import Identifier from '#models/identifier'
import BookDto from '#dtos/book'

export default class IdentifierDto extends BaseModelDto {
  declare id: string
  declare value: string
  declare type: 'audible:asin' | 'amazon:asin' | 'isbn10' | 'isbn13' | 'ean'
  declare books: BookDto[]
  declare createdAt: string
  declare updatedAt: string

  constructor(identifier?: Identifier) {
    super()

    if (!identifier) return
    this.id = identifier.publicId
    this.value = identifier.value
    this.type = identifier.type
    this.books = BookDto.fromArray(identifier.books)
    this.createdAt = identifier.createdAt.toISO()!
    this.updatedAt = identifier.updatedAt.toISO()!
  }
}
