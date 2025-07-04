import { BaseModelDto } from '@adocasts.com/dto/base'
import Contributor from '#models/contributor'
import { IdentifierFullDto, IdentifierBaseDto } from '#dtos/identifier'
import { ContributorType } from '../enum/contributor_enum.js'
import { createdAtApiProperty, nanoIdApiProperty } from '#config/openapi'
import { ApiProperty, ApiPropertyOptional } from '@foadonis/openapi/decorators'
import { imageApiProperty } from '#dtos/image'

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
    description:
      'The role of the contributor. This is only available in a context connected to a book.',
    example: 'Max John',
    nullable: true,
  })
  declare role: string | null

  @ApiPropertyOptional({
    type: 'number',
    description:
      'The type of the contributor. The type is only available in a context connected to a book. A single contributor can therefore have multiple types and is not assigned to a single type.\n\nTypes:\nAUTHOR = 1\nNARRATOR = 2\nILLUSTRATOR = 3\nPRODUCTION = 4\nEDITOR = 5\nSCRIPTWRITER = 6\nTRANSLATOR = 7\nOTHER = 99',
    enum: ContributorType,
    example: ContributorType.NARRATOR,
    nullable: false,
  })
  declare type: number

  @ApiPropertyOptional({
    type: 'string',
    description: 'The country of the contributor.',
    example: 'US',
    nullable: true,
  })
  declare country: string | null

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
    this.country = contributor.country
  }
}

export class ContributorBaseDto extends ContributorMinimalDto {
  @imageApiProperty('Image of Contributor')
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

  @ApiPropertyOptional({
    type: 'string',
    description: 'The website of the contributor.',
    example: 'https://example.com',
    nullable: true,
  })
  declare website: string | null

  @ApiPropertyOptional({
    type: 'string',
    description: 'The birth date of the contributor.',
    example: '1990-01-01',
    nullable: true,
  })
  declare birthDate: Date | null

  constructor(contributor?: Contributor) {
    super(contributor)
    if (!contributor) return

    this.description = contributor.description
    this.website = contributor.website
    this.birthDate = contributor.birthDate?.toJSDate() || null
    this.identifiers = IdentifierFullDto.fromArray(contributor.identifiers)
    this.createdAt = contributor.createdAt.toISO()!
    this.updatedAt = contributor.updatedAt.toISO()!
  }
}
