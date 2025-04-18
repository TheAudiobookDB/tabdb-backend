import { BaseModelDto } from '@adocasts.com/dto/base'
import Image from '#models/image'
import { BookDto } from '#dtos/book'

export class ImageMinimalDto extends BaseModelDto {
  declare image: object

  constructor(image?: Image) {
    super()
    if (!image) return
    this.image = image.imageUrl!
  }
}

export class ImageBaseDto extends ImageMinimalDto {
  declare id: string

  constructor(image?: Image) {
    super(image)
    if (!image) return
    this.id = image.publicId
  }
}

export class ImageFullDto extends ImageBaseDto {
  declare book: BookDto | null
  declare createdAt: string
  declare updatedAt: string

  constructor(image?: Image) {
    super(image)
    if (!image) return
    this.book = image.book ? new BookDto(image.book) : null
    this.createdAt = image.createdAt.toISO()!
    this.updatedAt = image.updatedAt.toISO()!
  }
}
