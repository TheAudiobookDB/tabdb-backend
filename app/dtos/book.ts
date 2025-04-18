import { BaseModelDto } from '@adocasts.com/dto/base'
import Book from '#models/book'
import { PublisherBaseDto, PublisherMinimalDto } from '#dtos/publisher'
import { BookGroupBaseDto, BookGroupFullDto } from '#dtos/book_group'
import { ContributorBaseDto, ContributorFullDto, ContributorMinimalDto } from '#dtos/contributor'
import { GenreBaseDto, GenreMinimalDto } from '#dtos/genre'
import { IdentifierBaseDto, IdentifierMinimalDto } from '#dtos/identifier'
import { SeriesBaseDto, SeriesMinimalDto } from '#dtos/series'
import { TrackBaseDto } from '#dtos/track'
import { ImageBaseDto } from '#dtos/image'

/**
 * Base class for common book fields.
 */
export abstract class BookBaseDto<
  TContributor = ContributorBaseDto,
  TGroup = BookGroupFullDto,
  TGenre = GenreBaseDto,
  TIdentifier = IdentifierBaseDto,
  TSeries = SeriesBaseDto,
  TPublisher = PublisherBaseDto,
> extends BaseModelDto {
  declare id: string
  declare title: string
  declare subtitle: string | null
  declare image: object | null
  declare language: string | null
  declare pages: number | null
  declare duration: number | null
  declare releasedAt: string | null
  declare isExplicit: boolean
  declare isAbridged: boolean | null
  declare groupId: number | null
  declare enabled: boolean
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
  declare summary: string | null
  declare description: string | null
  declare tracks: TrackBaseDto[]
  declare createdAt: string
  declare updatedAt: string
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
    this.tracks = TrackBaseDto.fromArray(book.tracks)
    this.createdAt = book.createdAt.toISO()!
    this.updatedAt = book.updatedAt.toISO()!
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
