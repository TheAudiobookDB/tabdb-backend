import { BaseModelDto } from '@adocasts.com/dto/base'
import Series from '#models/series'
import { IdentifierFullDto } from '#dtos/identifier'
import { BookDto } from '#dtos/book'

export class SeriesMinimalDto extends BaseModelDto {
  declare id: string
  declare name: string
  declare position: string | null

  constructor(series?: Series) {
    super()
    if (!series) return
    this.id = series.publicId
    this.name = series.name
    if (series.$extras.pivot_position) {
      this.position = series.$extras.pivot_position
    }
  }
}

export class SeriesBaseDto extends SeriesMinimalDto {
  declare description: string | null
  declare image: object | null
  declare language: string | null

  constructor(series?: Series) {
    super(series)
    if (!series) return
    this.description = series.description
    this.image = series.imageUrl
    this.language = series.language
  }
}

export class SeriesFullDto extends SeriesBaseDto {
  declare identifiers: IdentifierFullDto[]
  declare createdAt: string
  declare updatedAt: string
  declare enabled: boolean

  constructor(series?: Series) {
    super(series)
    if (!series) return
    this.identifiers = IdentifierFullDto.fromArray(series.identifiers)
    this.createdAt = series.createdAt.toISO()!
    this.updatedAt = series.updatedAt.toISO()!
    this.enabled = series.enabled
  }
}

export class SeriesWithBooksDto extends SeriesBaseDto {
  declare books: BookDto[]

  constructor(series?: Series, bookDto: { fromArray: (books: any[]) => any[] } = BookDto) {
    super(series)
    if (!series) return
    this.books = bookDto.fromArray(series.books)
  }
}
