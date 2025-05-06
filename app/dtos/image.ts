import { BaseModelDto } from '@adocasts.com/dto/base'
import Image from '#models/image'
import { createdAtApiProperty, nanoIdApiProperty, updatedAtApiProperty } from '#config/openapi'
import { ApiProperty } from '@foadonis/openapi/decorators'

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
  @createdAtApiProperty()
  declare createdAt: string

  @updatedAtApiProperty()
  declare updatedAt: string

  constructor(image?: Image) {
    super(image)
    if (!image) return
    this.createdAt = image.createdAt.toISO()!
    this.updatedAt = image.updatedAt.toISO()!
  }
}

export class SingleImageDto extends BaseModelDto {
  @ApiProperty({
    type: 'string',
    format: 'uri',
    description:
      'A thumb image URL. The dimensions are 200x200. Must be used if you display search results to the user.',
  })
  declare thumb: string

  @ApiProperty({
    type: 'string',
    format: 'uri',
    description:
      'A small image URL. The dimensions are 500x500. Must be used if you display multiple items or pagination results to the user.',
  })
  declare small: string

  @ApiProperty({
    type: 'string',
    format: 'uri',
    description:
      'A medium image URL. The dimensions are 1000x1000. Must be used for displaying a single item to the user. Is not allowed to be used for displaying additional images on the page, unless the user clicks on one to increase quality. Similar to large',
  })
  declare medium: string

  @ApiProperty({
    type: 'string',
    format: 'uri',
    description:
      'A large image URL. This returns the maximum size available but at maximum 3000x3000. Is only allowed to be used if the user presses an extra button to load this image quality such as a download button.',
  })
  declare large: string

  constructor(image?: Image) {
    super()
    if (!image) return
    this.thumb = image.imageUrl!['thumb']!
    this.small = image.imageUrl!['small']!
    this.medium = image.imageUrl!['medium']!
    this.large = image.imageUrl!['large']!
  }
}

export const imageApiProperty = (additionalDescription?: string) =>
  ApiProperty({
    type: SingleImageDto,
    description: `${additionalDescription ? additionalDescription + '. ' : ''}To use the images, you have to read the descriptions of the different types. If you don't use the images correctly, you will be blocked from using the API. Note that any "must" still can use lower quality images, but not higher quality images.`,
    nullable: true,
  })
