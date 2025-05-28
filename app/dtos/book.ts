import { BaseModelDto } from '@adocasts.com/dto/base'
import Book from '#models/book'
import { PublisherBaseDto, PublisherMinimalDto } from '#dtos/publisher'
import { BookGroupBaseDto, BookGroupFullDto } from '#dtos/book_group'
import { ContributorFullDto, ContributorMinimalDto } from '#dtos/contributor'
import { GenreBaseDto, GenreMinimalDto } from '#dtos/genre'
import { IdentifierBaseDto, IdentifierMinimalDto } from '#dtos/identifier'
import { SeriesBaseDto, SeriesMinimalDto } from '#dtos/series'
import { TrackBaseDto } from '#dtos/track'
import { imageApiProperty, ImageBaseDto } from '#dtos/image'
import { ApiProperty, ApiPropertyOptional } from '@foadonis/openapi/decorators'
import {
  createdAtApiProperty,
  languageApiProperty,
  nanoIdApiProperty,
  updatedAtApiProperty,
} from '#config/openapi'
import { DateTime } from 'luxon'

export class BookBaseDto extends BaseModelDto {
  @nanoIdApiProperty()
  id: string = ''

  @ApiProperty({
    type: 'string',
    description: 'The title of the book.',
    example: 'Sample Book Title',
  })
  title: string = ''

  @ApiPropertyOptional({
    type: 'string',
    description: 'The subtitle of the book.',
    example: 'Sample Book Subtitle',
    nullable: true,
  })
  subtitle: string | null = null

  @imageApiProperty('The avatar of the user.')
  image: object | null = null

  @languageApiProperty()
  language: string | null = null

  @ApiPropertyOptional({
    type: 'number',
    description: 'The number of pages in the book.',
    example: 300,
    nullable: true,
  })
  pages: number | null = null

  @ApiPropertyOptional({
    type: 'number',
    description: 'The duration of the book in seconds.',
    example: 3600,
    nullable: true,
  })
  duration: number | null = null

  @ApiPropertyOptional({
    type: 'string',
    format: 'date-time',
    description: 'The release date of the book.',
    example: '2023-10-01T00:00:00Z',
    nullable: true,
  })
  releasedAt: string | null = null

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the book is explicit or not.',
    example: false,
    nullable: false,
    default: false,
  })
  isExplicit: boolean = false

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the book is abridged or not.',
    example: false,
    nullable: false,
    default: false,
  })
  isAbridged: boolean | null = null

  groupId: number | null = null
  enabled: boolean = false

  @ApiProperty({
    description: 'The type of the book.',
    enum: ['book', 'audiobook', 'podcast', 'e-book'],
    example: 'audiobook',
    nullable: false,
  })
  type: 'book' | 'audiobook' | 'podcast' | 'e-book' = 'book'

  constructor(book?: Book) {
    super()
    if (!book) return

    this.id = book.publicId
    this.title = book.title
    this.subtitle = book.subtitle
    this.language = book.language
    this.pages = book.pages
    this.duration = book.duration
    this.releasedAt = book.releasedAt?.toISO() || null
    this.isExplicit = book.isExplicit
    this.isAbridged = book.isAbridged
    this.groupId = book.groupId
    this.enabled = book.enabled
    this.type = book.type
    this.image = book.imageUrl
  }
}

export class BookDto extends BookBaseDto {
  @ApiPropertyOptional({
    type: 'string',
    description: 'The summary of the book.',
    example: 'This is a sample book summary.',
    nullable: true,
  })
  summary: string | null = null

  @ApiPropertyOptional({
    type: 'string',
    description: 'The description of the book.',
    example: 'This is a sample book description.',
    nullable: true,
  })
  description: string | null = null

  @ApiPropertyOptional({
    type: () => [TrackBaseDto],
    description: 'List of tracks in the book.',
    nullable: true,
  })
  tracks: TrackBaseDto[] = []

  @createdAtApiProperty()
  createdAt: string = ''

  @updatedAtApiProperty()
  updatedAt: string = ''

  @ApiPropertyOptional({
    type: () => [ImageBaseDto],
    description:
      'List of images associated with the book. The cover image is excluded. Also the cover images is always returned. Additional images should be considered optional and only be loaded upon user-interaction.',
    nullable: true,
  })
  images: ImageBaseDto[] = []

  @ApiProperty({
    type: [ContributorFullDto],
    description: 'List of contributors associated with the book.',
  })
  contributors: ContributorFullDto[] = []

  @ApiProperty({
    type: [GenreBaseDto],
    description: 'List of genres associated with the book.',
  })
  genres: GenreBaseDto[] = []

  @ApiProperty({
    type: [IdentifierBaseDto],
    description: 'List of identifiers associated with the book.',
  })
  identifiers: IdentifierBaseDto[] = []

  @ApiProperty({
    type: [SeriesBaseDto],
    description: 'List of series associated with the book.',
  })
  series: SeriesBaseDto[] = []

  @ApiPropertyOptional({
    type: () => BookGroupFullDto,
    description: 'The group associated with the book.',
    nullable: true,
  })
  group: BookGroupFullDto | null = null

  @ApiPropertyOptional({
    type: () => PublisherBaseDto,
    description: 'The publisher associated with the book.',
    nullable: true,
  })
  publisher: PublisherBaseDto | null = null

  constructor(book?: Book) {
    super(book)
    if (!book) return

    this.summary = book.summary
    this.description = book.description
    this.tracks = book.tracks ? book.tracks.map((track) => new TrackBaseDto(track)) : []
    this.createdAt = book.createdAt?.toISO() || DateTime.now().toISO()
    this.updatedAt = book.updatedAt?.toISO() || DateTime.now().toISO()
    this.images = book.images ? ImageBaseDto.fromArray(book.images) : []
    this.contributors = ContributorFullDto.fromArray(book.contributors)
    this.genres = GenreBaseDto.fromArray(book.genres)
    this.identifiers = IdentifierBaseDto.fromArray(book.identifiers)
    this.series = SeriesBaseDto.fromArray(book.series)
    this.group = book.group ? new BookGroupFullDto(book.group) : null
    this.publisher = book.publisher ? new PublisherBaseDto(book.publisher) : null
  }
}

export class SearchBookDto extends BookBaseDto {
  @ApiProperty({
    type: [ContributorMinimalDto],
    description: 'List of contributors associated with the book.',
  })
  contributors: ContributorMinimalDto[] = []

  @ApiProperty({
    type: [GenreMinimalDto],
    description: 'List of genres associated with the book.',
  })
  genres: GenreMinimalDto[] = []

  @ApiProperty({
    type: [IdentifierMinimalDto],
    description: 'List of identifiers associated with the book.',
  })
  identifiers: IdentifierMinimalDto[] = []

  @ApiProperty({
    type: [SeriesMinimalDto],
    description: 'List of series associated with the book.',
  })
  series: SeriesMinimalDto[] = []

  @ApiPropertyOptional({
    type: () => BookGroupBaseDto,
    description: 'The group associated with the book.',
    nullable: true,
  })
  group: BookGroupBaseDto | null = null

  @ApiPropertyOptional({
    type: () => PublisherMinimalDto,
    description: 'The publisher associated with the book.',
    nullable: true,
  })
  publisher: PublisherMinimalDto | null = null

  constructor(book?: Book) {
    super(book)
    if (!book) return

    this.contributors = ContributorMinimalDto.fromArray(book.contributors)
    this.genres = GenreMinimalDto.fromArray(book.genres)
    this.identifiers = IdentifierMinimalDto.fromArray(book.identifiers)
    this.series = SeriesMinimalDto.fromArray(book.series)
    this.group = book.group ? new BookGroupBaseDto(book.group) : null
    this.publisher = book.publisher ? new PublisherMinimalDto(book.publisher) : null
  }
}
