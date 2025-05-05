import { BaseModelDto } from '@adocasts.com/dto/base'
import BookGroup from '#models/book_group'
import { createdAtApiProperty, nanoIdApiProperty, updatedAtApiProperty } from '#config/openapi'
import { ApiProperty } from '@foadonis/openapi/decorators'

export class BookGroupBaseDto extends BaseModelDto {
  @nanoIdApiProperty()
  declare id: string

  @ApiProperty({
    type: 'string',
    description: 'The name of the book group.',
    example: 'Sample Book Group',
  })
  declare name: string

  constructor(bookGroup?: BookGroup) {
    super()

    if (!bookGroup) return
    this.id = bookGroup.publicId
    this.name = bookGroup.name
  }
}

export class BookGroupFullDto extends BookGroupBaseDto {
  @createdAtApiProperty()
  declare createdAt: string

  @updatedAtApiProperty()
  declare updatedAt: string

  constructor(bookGroup?: BookGroup) {
    super(bookGroup)

    if (!bookGroup) return
    this.createdAt = bookGroup.createdAt.toISO()!
    this.updatedAt = bookGroup.updatedAt.toISO()!
  }
}
