import { BaseModelDto } from '@adocasts.com/dto/base'
import Contributor from '#models/contributor'
import IdentifierDto from '#dtos/identifier'
import { BookDto } from '#dtos/book'

export class ContributorBaseDto extends BaseModelDto {
  declare id: string
  declare name: string
  declare image: string | null

  constructor(contributor?: Contributor) {
    super()

    if (!contributor) return
    this.id = contributor.publicId
    this.name = contributor.name
    this.image = contributor.image
  }
}

export class ContributorFullDto extends ContributorBaseDto {
  declare description: string | null
  declare identifiers: IdentifierDto[]
  declare createdAt: string
  declare updatedAt: string

  constructor(contributor?: Contributor) {
    super(contributor)

    if (!contributor) return
    this.description = contributor.description
    this.identifiers = IdentifierDto.fromArray(contributor.identifiers)
    this.createdAt = contributor.createdAt.toISO()!
    this.updatedAt = contributor.updatedAt.toISO()!
  }
}

export class ContributorWithBooksDto extends ContributorBaseDto {
  declare books: BookDto[]

  constructor(contributor?: Contributor) {
    super(contributor)

    if (!contributor) return
    this.books = BookDto.fromArray(contributor.books)
  }
}
