import { BaseModelDto } from '@adocasts.com/dto/base'
import Publisher from '#models/publisher'
import { BookDto } from '#dtos/book'
import { ApiProperty } from '@foadonis/openapi/decorators'
import { createdAtApiProperty, nanoIdApiProperty, updatedAtApiProperty } from '#config/openapi'

export class PublisherMinimalDto extends BaseModelDto {
  @nanoIdApiProperty()
  declare id: string

  @ApiProperty({
    type: 'string',
    description: 'The name of the publisher.',
    example: 'Sample Publisher',
  })
  declare name: string

  constructor(publisher?: Publisher) {
    super()
    if (!publisher) return
    this.id = publisher.publicId
    this.name = publisher.name
  }
}

export class PublisherBaseDto extends PublisherMinimalDto {
  @ApiProperty({
    type: 'string',
    description: 'Description of the publisher.',
    example: 'Sample Publisher Description',
  })
  declare description: string | null

  constructor(publisher?: Publisher) {
    super(publisher)
    if (!publisher) return
    this.description = publisher.description
  }
}

export class PublisherFullDto extends PublisherBaseDto {
  @createdAtApiProperty()
  declare createdAt: string

  @updatedAtApiProperty()
  declare updatedAt: string

  constructor(publisher?: Publisher) {
    super(publisher)
    if (!publisher) return
    this.createdAt = publisher.createdAt.toISO()!
    this.updatedAt = publisher.updatedAt.toISO()!
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
