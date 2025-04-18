import { BaseModelDto } from '@adocasts.com/dto/base'
import Genre from '#models/genre'
import { BookDto } from '#dtos/book'

export class GenreMinimalDto extends BaseModelDto {
  declare id: string
  declare name: string

  constructor(genre?: Genre) {
    super()
    if (!genre) return
    this.id = genre.publicId
    this.name = genre.name
  }
}

export class GenreBaseDto extends BaseModelDto {
  declare id: string
  declare name: string
  declare type: 'genre' | 'tag'

  constructor(genre?: Genre) {
    super()
    if (!genre) return
    this.id = genre.publicId
    this.name = genre.name
    this.type = genre.type
  }
}

export class GenreFullDto extends GenreBaseDto {
  declare createdAt: string
  declare updatedAt: string
  declare enabled: boolean

  constructor(genre?: Genre) {
    super(genre)
    if (!genre) return
    this.createdAt = genre.createdAt.toISO()!
    this.updatedAt = genre.updatedAt.toISO()!
    this.enabled = genre.enabled
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
