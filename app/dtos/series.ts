import { BaseModelDto } from '@adocasts.com/dto/base'
import Series from '#models/series'
import { IdentifierFullDto } from '#dtos/identifier'
import { BookDto } from '#dtos/book'
import {
  createdAtApiProperty,
  languageApiProperty,
  nanoIdApiProperty,
  updatedAtApiProperty,
} from '#config/openapi'
import { ApiProperty } from '@foadonis/openapi/decorators'
import { ImageBaseDto } from '#dtos/image'

export class SeriesMinimalDto extends BaseModelDto {
  @nanoIdApiProperty()
  declare id: string

  @ApiProperty({
    type: 'string',
    description: 'The name of the series.',
    example: 'Sample Series',
  })
  declare name: string

  @ApiProperty({
    type: 'string',
    description: 'The position of the series in the book. Is not numeric and can be any string.',
    example: '1',
    nullable: true,
  })
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
  @ApiProperty({
    type: ImageBaseDto,
    description: 'The image of the series.',
  })
  declare image: object | null

  @languageApiProperty()
  declare language: string | null

  constructor(series?: Series) {
    super(series)
    if (!series) return
    this.image = series.imageUrl
    this.language = series.language
  }
}

export class SeriesFullDto extends SeriesBaseDto {
  @ApiProperty({
    type: [IdentifierFullDto],
    description: 'The identifiers of the series.',
  })
  declare identifiers: IdentifierFullDto[]

  @createdAtApiProperty()
  declare createdAt: string

  @updatedAtApiProperty()
  declare updatedAt: string

  @ApiProperty({
    type: 'string',
    description: 'Description of the series.',
    example: 'Sample Series Description',
  })
  declare description: string | null

  constructor(series?: Series) {
    super(series)
    if (!series) return
    this.description = series.description
    this.identifiers = IdentifierFullDto.fromArray(series.identifiers)
    this.createdAt = series.createdAt.toISO()!
    this.updatedAt = series.updatedAt.toISO()!
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
