import { BaseModelDto } from '@adocasts.com/dto/base'
import Publisher from '#models/publisher'
import BookDto from '#dtos/book'

export default class PublisherDto extends BaseModelDto {
  declare id: string
  declare name: string
  declare description: string | null
  declare enabled: boolean
  declare createdAt: string
  declare updatedAt: string
  declare books: BookDto[]

  constructor(publisher?: Publisher) {
    super()

    if (!publisher) return
    this.id = publisher.publicId
    this.name = publisher.name
    this.description = publisher.description
    this.enabled = publisher.enabled
    this.createdAt = publisher.createdAt.toISO()!
    this.updatedAt = publisher.updatedAt.toISO()!
    this.books = BookDto.fromArray(publisher.books)
  }
}
