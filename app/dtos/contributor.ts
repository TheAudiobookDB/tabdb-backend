import { BaseModelDto } from '@adocasts.com/dto/base'
import Contributor from '#models/contributor'
import { BookDto } from '#dtos/book'
import { IdentifierFullDto, IdentifierBaseDto } from '#dtos/identifier'
import { ContributorType } from '../enum/contributor_enum.js'
import { createdAtApiProperty, nanoIdApiProperty } from '#config/openapi'
import { ApiProperty, ApiPropertyOptional } from '@foadonis/openapi/decorators'
import { ImageBaseDto } from '#dtos/image'

export class ContributorMinimalDto extends BaseModelDto {
  @nanoIdApiProperty()
  declare id: string

  @ApiProperty({
    type: 'string',
    description: 'The name of the contributor.',
    example: 'John Doe',
  })
  declare name: string

  @ApiPropertyOptional({
    type: 'string',
    description: 'The role of the contributor.',
    example: 'Max John',
    nullable: true,
  })
  declare role: string | null

  @ApiPropertyOptional({
    type: 'number',
    description: 'The type of the contributor.',
    enum: ContributorType,
    example: ContributorType.NARRATOR,
    nullable: false,
  })
  declare type: number

  constructor(contributor?: Contributor) {
    super()
    if (!contributor) return
    this.id = contributor.publicId
    this.name = contributor.name
    if (
      (contributor.$extras.pivot_type &&
        contributor.$extras.pivot_type === ContributorType.NARRATOR) ||
      (!contributor.$extras.pivot_type && contributor.$extras.pivot_role)
    ) {
      this.role = contributor.$extras.pivot_role
    }
    if (contributor.$extras.pivot_type) {
      this.type = contributor.$extras.pivot_type
    }
  }
}

export class ContributorBaseDto extends ContributorMinimalDto {
  @ApiProperty({
    type: () => ImageBaseDto,
    description: 'Image of the contributor.',
    nullable: true,
  })
  declare image: object | null

  @ApiPropertyOptional({
    type: () => [IdentifierBaseDto],
    description: 'List of identifiers associated with the contributor.',
    nullable: true,
  })
  declare identifiers: IdentifierBaseDto[]

  constructor(contributor?: Contributor) {
    super(contributor)
    if (!contributor) return
    this.image = contributor.imageUrl
    this.identifiers = IdentifierBaseDto.fromArray(contributor.identifiers)
  }
}

export class ContributorFullDto extends ContributorBaseDto {
  @createdAtApiProperty()
  declare createdAt: string

  @createdAtApiProperty()
  declare updatedAt: string

  @ApiPropertyOptional({
    type: () => [IdentifierFullDto],
    description:
      'List of identifiers associated with the contributor. This is a full representation.',
    nullable: true,
  })
  declare identifiers: IdentifierFullDto[]

  @ApiPropertyOptional({
    type: 'string',
    description: 'The description of the contributor.',
    example: 'This is a sample description.',
    nullable: true,
  })
  declare description: string | null

  constructor(contributor?: Contributor) {
    super(contributor)
    if (!contributor) return
    this.createdAt = contributor.createdAt.toISO()!
    this.updatedAt = contributor.updatedAt.toISO()!
    this.description = contributor.description
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
