import { BaseModelDto } from '@adocasts.com/dto/base'
import Series from '#models/series'
import IdentifierDto from '#dtos/identifier'
import BookDto from '#dtos/book'

export default class SeriesDto extends BaseModelDto {
  declare id: string
  declare name: string
  declare description: string | null
  declare image: string | null
  declare enabled: boolean
  declare language: string | null
  declare identifiers: IdentifierDto[]
  declare books: BookDto[]
  declare createdAt: string
  declare updatedAt: string

  constructor(series?: Series) {
    super()

    if (!series) return
    this.id = series.publicId
    this.name = series.name
    this.description = series.description
    this.image = series.image
    this.enabled = series.enabled
    this.language = series.language
    this.identifiers = IdentifierDto.fromArray(series.identifiers)
    this.books = BookDto.fromArray(series.books)
    this.createdAt = series.createdAt.toISO()!
    this.updatedAt = series.updatedAt.toISO()!
  }
}
