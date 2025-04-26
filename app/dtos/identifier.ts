import { BaseModelDto } from '@adocasts.com/dto/base'
import Identifier from '#models/identifier'
import { BookDto } from '#dtos/book'

export class IdentifierMinimalDto extends BaseModelDto {
  declare id: string
  declare value: string
  declare type: 'audible:asin' | 'amazon:asin' | 'isbn10' | 'isbn13' | 'ean'

  constructor(identifier?: Identifier) {
    super()
    if (!identifier) return
    this.id = identifier.publicId
    this.value = identifier.value
    this.type = identifier.type
  }
}

export class IdentifierBaseDto extends IdentifierMinimalDto {
  declare extra: string | null

  constructor(identifier?: Identifier) {
    super(identifier)
    if (!identifier) return
    this.extra = identifier.extra
  }
}

export class IdentifierFullDto extends IdentifierBaseDto {
  declare createdAt: string
  declare updatedAt: string

  constructor(identifier?: Identifier) {
    super(identifier)
    if (!identifier) return
    this.createdAt = identifier.createdAt.toISO()!
    this.updatedAt = identifier.updatedAt.toISO()!
  }
}

export class IdentifierWithBooksDto extends IdentifierBaseDto {
  declare books: BookDto[]

  constructor(identifier?: Identifier, bookDto: { fromArray: (books: any[]) => any[] } = BookDto) {
    super(identifier)
    if (!identifier) return
    this.books = bookDto.fromArray(identifier.books)
  }
}
