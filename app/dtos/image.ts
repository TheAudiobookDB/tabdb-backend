import { BaseModelDto } from '@adocasts.com/dto/base'
import Image from '#models/image'
import { createdAtApiProperty, nanoIdApiProperty, updatedAtApiProperty } from '#config/openapi'
import { ApiProperty } from '@foadonis/openapi/decorators'
import { BookDto } from '#dtos/book'

export class ImageMinimalDto extends BaseModelDto {
  @ApiProperty({
    schema: {
      title: 'Image',
      type: 'object',
      properties: {
        thumb: {
          type: 'string',
          format: 'uri',
        },
        small: {
          type: 'string',
          format: 'uri',
        },
        medium: {
          type: 'string',
          format: 'uri',
        },
        large: {
          type: 'string',
          format: 'uri',
        },
      },
    },
  })
  declare image: object

  constructor(image?: Image) {
    super()
    if (!image) return
    this.image = image.imageUrl!
  }
}

export class ImageBaseDto extends ImageMinimalDto {
  @nanoIdApiProperty()
  declare id: string

  constructor(image?: Image) {
    super(image)
    if (!image) return
    this.id = image.publicId
  }
}

export class ImageFullDto extends ImageBaseDto {
  declare book: BookDto | null

  @createdAtApiProperty()
  declare createdAt: string

  @updatedAtApiProperty()
  declare updatedAt: string

  constructor(image?: Image) {
    super(image)
    if (!image) return
    this.book = image.book ? new BookDto(image.book) : null
    this.createdAt = image.createdAt.toISO()!
    this.updatedAt = image.updatedAt.toISO()!
  }
}
