import { BaseModelDto } from '@adocasts.com/dto/base'
import BookGroup from '#models/book_group'

export class BookGroupBaseDto extends BaseModelDto {
  declare id: string
  declare name: string

  constructor(bookGroup?: BookGroup) {
    super()

    if (!bookGroup) return
    this.id = bookGroup.publicId
    this.name = bookGroup.name
  }
}

export class BookGroupFullDto extends BookGroupBaseDto {
  declare createdAt: string
  declare updatedAt: string

  constructor(bookGroup?: BookGroup) {
    super(bookGroup)

    if (!bookGroup) return
    this.createdAt = bookGroup.createdAt.toISO()!
    this.updatedAt = bookGroup.updatedAt.toISO()!
  }
}
