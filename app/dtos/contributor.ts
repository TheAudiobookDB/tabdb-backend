import { BaseModelDto } from '@adocasts.com/dto/base'
import Contributor from '#models/contributor'
import { BookDto } from '#dtos/book'
import { IdentifierMinimalDto, IdentifierFullDto } from '#dtos/identifier'

export class ContributorMinimalDto extends BaseModelDto {
  declare id: string
  declare name: string

  constructor(contributor?: Contributor) {
    super()
    if (!contributor) return
    this.id = contributor.publicId
    this.name = contributor.name
  }
}

export class ContributorBaseDto extends ContributorMinimalDto {
  declare image: string | null
  declare description: string | null
  declare identifiers: IdentifierMinimalDto[]

  constructor(contributor?: Contributor) {
    super(contributor)
    if (!contributor) return
    this.image = contributor.image
    this.description = contributor.description
    this.identifiers = IdentifierMinimalDto.fromArray(contributor.identifiers)
  }
}

export class ContributorFullDto extends ContributorBaseDto {
  declare createdAt: string
  declare updatedAt: string
  declare identifiers: IdentifierFullDto[]

  constructor(contributor?: Contributor) {
    super(contributor)
    if (!contributor) return
    this.createdAt = contributor.createdAt.toISO()!
    this.updatedAt = contributor.updatedAt.toISO()!
    this.identifiers = IdentifierFullDto.fromArray(contributor.identifiers)
  }
}

export class ContributorWithBooksDto extends ContributorBaseDto {
  declare books: BookDto[]

  constructor(
    contributor?: Contributor,
    bookDto: { fromArray: (books: any[]) => any[] } = BookDto
  ) {
    super(contributor)
    if (!contributor) return
    this.books = bookDto.fromArray(contributor.books)
  }
}
