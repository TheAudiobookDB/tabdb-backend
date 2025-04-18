import { BaseModelDto } from '@adocasts.com/dto/base'
import Publisher from '#models/publisher'
import { BookDto } from '#dtos/book'

export class PublisherMinimalDto extends BaseModelDto {
  declare id: string
  declare name: string

  constructor(publisher?: Publisher) {
    super()
    if (!publisher) return
    this.id = publisher.publicId
    this.name = publisher.name
  }
}

export class PublisherBaseDto extends PublisherMinimalDto {
  declare description: string | null

  constructor(publisher?: Publisher) {
    super(publisher)
    if (!publisher) return
    this.description = publisher.description
  }
}

export class PublisherFullDto extends PublisherBaseDto {
  declare createdAt: string
  declare updatedAt: string
  declare enabled: boolean

  constructor(publisher?: Publisher) {
    super(publisher)
    if (!publisher) return
    this.createdAt = publisher.createdAt.toISO()!
    this.updatedAt = publisher.updatedAt.toISO()!
    this.enabled = publisher.enabled
  }
}

export class PublisherWithBooksDto extends PublisherBaseDto {
  declare books: BookDto[]

  constructor(publisher?: Publisher, bookDto: { fromArray: (books: any[]) => any[] } = BookDto) {
    super(publisher)
    if (!publisher) return
    this.books = bookDto.fromArray(publisher.books)
  }
}
