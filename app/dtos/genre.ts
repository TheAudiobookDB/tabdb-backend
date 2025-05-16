import { BaseModelDto } from '@adocasts.com/dto/base'
import Genre from '#models/genre'
import { BookDto } from '#dtos/book'
import { createdAtApiProperty, nanoIdApiProperty, updatedAtApiProperty } from '#config/openapi'
import { ApiProperty } from '@foadonis/openapi/decorators'

export class GenreMinimalDto extends BaseModelDto {
  @nanoIdApiProperty()
  declare id: string

  @ApiProperty({
    type: 'string',
    description: 'The name of the genre.',
    example: 'Science Fiction',
  })
  declare name: string

  @ApiProperty({
    type: 'string',
    enum: ['genre', 'tag'],
    description: 'The type of the genre.',
    example: 'genre',
  })
  declare type: 'genre' | 'tag'

  constructor(genre?: Genre) {
    super()
    if (!genre) return
    this.id = genre.publicId
    this.name = genre.name
    this.type = genre.type
  }
}

export class GenreBaseDto extends GenreMinimalDto {
  constructor(genre?: Genre) {
    super(genre)
  }
}

export class GenreFullDto extends GenreBaseDto {
  @createdAtApiProperty()
  declare createdAt: string

  @updatedAtApiProperty()
  declare updatedAt: string

  constructor(genre?: Genre) {
    super(genre)
    if (!genre) return
    this.createdAt = genre.createdAt.toISO()!
    this.updatedAt = genre.updatedAt.toISO()!
  }
}

export class GenreWithBooksDto extends GenreBaseDto {
  declare books: BookDto[]

  constructor(genre?: Genre, bookDto: { fromArray: (books: any[]) => any[] } = BookDto) {
    super(genre)
    if (!genre) return
    this.books = bookDto.fromArray(genre.books)
  }
}
