import { BaseModelDto } from '@adocasts.com/dto/base'
import Identifier from '#models/identifier'
import { ApiProperty, ApiPropertyOptional } from '@foadonis/openapi/decorators'
import { createdAtApiProperty, updatedAtApiProperty } from '#config/openapi'

export class IdentifierMinimalDto extends BaseModelDto {
  @ApiProperty({
    type: 'string',
    description: 'The unique identifier for the identifier.',
    example: '1234567890',
  })
  declare id: string
  @ApiProperty({
    type: 'string',
    description: 'The public identifier for the identifier.',
    example: '1234567890',
  })
  declare value: string
  @ApiPropertyOptional({
    type: 'string',
    description: 'The type of identifier.',
    enum: ['audible:asin', 'amazon:asin', 'isbn10', 'isbn13', 'ean'],
    example: 'isbn10',
  })
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
  @ApiPropertyOptional({
    type: 'string',
    description:
      'The extra information associated with the identifier. For audible ASIN this is the region.',
    example: 'us',
  })
  declare extra: string | null

  constructor(identifier?: Identifier) {
    super(identifier)
    if (!identifier) return
    this.extra = identifier.extra
  }
}

export class IdentifierFullDto extends IdentifierBaseDto {
  @createdAtApiProperty()
  declare createdAt: string

  @updatedAtApiProperty()
  declare updatedAt: string

  constructor(identifier?: Identifier) {
    super(identifier)
    if (!identifier) return
    this.createdAt = identifier.createdAt.toISO()!
    this.updatedAt = identifier.updatedAt.toISO()!
  }
}
