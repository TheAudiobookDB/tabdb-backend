import { BaseModelDto } from '@adocasts.com/dto/base'
import Book from '#models/book'
import { PublisherBaseDto, PublisherMinimalDto } from '#dtos/publisher'
import { BookGroupBaseDto, BookGroupFullDto } from '#dtos/book_group'
import { ContributorBaseDto, ContributorFullDto, ContributorMinimalDto } from '#dtos/contributor'
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

/**
 * Base class for common book fields.
 */
export class BookBaseDto<
  TContributor = ContributorBaseDto,
  TGroup = BookGroupFullDto,
  TGenre = GenreBaseDto,
  TIdentifier = IdentifierBaseDto,
  TSeries = SeriesBaseDto,
  TPublisher = PublisherBaseDto,
> extends BaseModelDto {
  @nanoIdApiProperty()
  declare id: string

  @ApiProperty({
    type: 'string',
    description: 'The title of the book.',
    example: 'Sample Book Title',
  })
  declare title: string

  @ApiPropertyOptional({
    type: 'string',
    description: 'The subtitle of the book.',
    example: 'Sample Book Subtitle',
    nullable: true,
  })
  declare subtitle: string | null

  @imageApiProperty('The avatar of the user.')
  declare image: object | null

  @languageApiProperty()
  declare language: string | null

  @ApiPropertyOptional({
    type: 'number',
    description: 'The number of pages in the book.',
    example: 300,
    nullable: true,
  })
  declare pages: number | null

  @ApiPropertyOptional({
    type: 'number',
    description: 'The duration of the book in seconds.',
    example: 3600,
    nullable: true,
  })
  declare duration: number | null

  @ApiPropertyOptional({
    type: 'string',
    format: 'date-time',
    description: 'The release date of the book.',
    example: '2023-10-01T00:00:00Z',
    nullable: true,
  })
  declare releasedAt: string | null

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the book is explicit or not.',
    example: false,
    nullable: false,
    default: false,
  })
  declare isExplicit: boolean

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the book is abridged or not.',
    example: false,
    nullable: false,
    default: false,
  })
  declare isAbridged: boolean | null
  declare groupId: number | null
  declare enabled: boolean

  @ApiProperty({
    description: 'The type of the book.',
    enum: ['book', 'audiobook', 'podcast', 'e-book'],
    example: 'audiobook',
    nullable: false,
  })
  declare type: 'book' | 'audiobook' | 'podcast' | 'e-book'
  declare contributors: TContributor[]
  declare genres: TGenre[]
  declare identifiers: TIdentifier[]
  declare series: TSeries[]
  declare group: TGroup | null
  declare publisher: TPublisher | null

  protected constructor(book?: Book) {
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
    this.contributors = [] as unknown as TContributor[]
    this.genres = [] as unknown as TGenre[]
    this.series = [] as unknown as TSeries[]
    this.identifiers = [] as unknown as TIdentifier[]
    this.group = book.group && ([] as unknown as TGroup)
    this.publisher = book.publisher && ([] as unknown as TPublisher)
    this.image = book.imageUrl
  }
}

/**
 * DTO extending common book fields with additional information
 * specific to the full book representation.
 */
export class BookDto extends BookBaseDto {
  @ApiPropertyOptional({
    type: 'string',
    description: 'The summary of the book.',
    example: 'This is a sample book summary.',
    nullable: true,
  })
  declare summary: string | null

  @ApiPropertyOptional({
    type: 'string',
    description: 'The description of the book.',
    example: 'This is a sample book description.',
    nullable: true,
  })
  declare description: string | null

  @ApiPropertyOptional({
    type: () => [TrackBaseDto],
    description: 'List of tracks in the book.',
    nullable: true,
  })
  declare tracks: TrackBaseDto[]

  @createdAtApiProperty()
  declare createdAt: string

  @updatedAtApiProperty()
  declare updatedAt: string

  @ApiPropertyOptional({
    type: () => [ImageBaseDto],
    description:
      'List of images associated with the book. The cover image is excluded. Also the cover images is always returned. Additional images should be considered optional and only be loaded upon user-interaction.',
    nullable: true,
  })
  declare images: ImageBaseDto[]

  constructor(book?: Book) {
    super(book)
    if (!book) return

    if (book.images) this.images = ImageBaseDto.fromArray(book.images)
    this.contributors = ContributorFullDto.fromArray(book.contributors)
    this.genres = GenreBaseDto.fromArray(book.genres)
    this.identifiers = IdentifierBaseDto.fromArray(book.identifiers)
    this.series = SeriesBaseDto.fromArray(book.series)
    this.group = book.group && new BookGroupFullDto(book.group)
    this.publisher = book.publisher && new PublisherBaseDto(book.publisher)
    this.summary = book.summary
    this.description = book.description
    this.tracks = book.tracks ? book.tracks.map((track) => new TrackBaseDto(track)) : []
    this.createdAt = book.createdAt?.toISO() || DateTime.now().toISO()
    this.updatedAt = book.updatedAt?.toISO() || DateTime.now().toISO()
  }
}

/**
 * DTO for search results that only require common book fields.
 *   TContributor = ContributorFullDto,
 *   TGroup = BookGroupFullDto,
 *   TGenre = GenreDto,
 *   TIdentifier = IdentifierDto,
 *   TSeries = SeriesDto,
 *   TPublisher = PublisherDto,
 */
export class SearchBookDto extends BookBaseDto<
  ContributorMinimalDto,
  BookGroupBaseDto,
  GenreMinimalDto,
  IdentifierMinimalDto,
  SeriesMinimalDto,
  PublisherMinimalDto
> {
  @ApiProperty({
    type: [ContributorMinimalDto],
    description: 'List of contributors associated with the book.',
  })
  declare contributors: ContributorMinimalDto[]

  @ApiProperty({
    type: [GenreMinimalDto],
    description: 'List of genres associated with the book.',
  })
  declare genres: GenreMinimalDto[]

  @ApiProperty({
    type: [IdentifierMinimalDto],
    description: 'List of identifiers associated with the book.',
  })
  declare identifiers: IdentifierMinimalDto[]

  @ApiProperty({
    type: [SeriesMinimalDto],
    description: 'List of series associated with the book.',
  })
  declare series: SeriesMinimalDto[]

  @ApiPropertyOptional({
    type: () => BookGroupBaseDto,
    description: 'The group associated with the book.',
    nullable: true,
  })
  declare group: BookGroupBaseDto | null

  @ApiPropertyOptional({
    type: () => PublisherMinimalDto,
    description: 'The publisher associated with the book.',
    nullable: true,
  })
  declare publisher: PublisherMinimalDto | null

  constructor(book?: Book) {
    super(book)

    if (!book) return
    this.contributors = ContributorMinimalDto.fromArray(book.contributors)
    this.genres = GenreMinimalDto.fromArray(book.genres)
    this.identifiers = IdentifierMinimalDto.fromArray(book.identifiers)
    this.series = SeriesMinimalDto.fromArray(book.series)
    this.group = book.group && new BookGroupBaseDto(book.group)
    this.publisher = book.publisher && new PublisherMinimalDto(book.publisher)
  }
}
