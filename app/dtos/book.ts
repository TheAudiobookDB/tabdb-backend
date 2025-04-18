import { BaseModelDto } from '@adocasts.com/dto/base'
import Book from '#models/book'
import { ContributorBaseDto, ContributorFullDto } from '#dtos/contributor'
import GenreDto from '#dtos/genre'
import IdentifierDto from '#dtos/identifier'
import SeriesDto from '#dtos/series'
import TrackDto from '#dtos/track'
import PublisherDto from '#dtos/publisher'
import { BookGroupFullDto } from '#dtos/book_group'

/**
 * Base class for common book fields.
 */
export abstract class BookBaseDto<
  TContributor = ContributorFullDto,
  TGroup = BookGroupFullDto,
  TGenre = GenreDto,
  TIdentifier = IdentifierDto,
  TSeries = SeriesDto,
  TPublisher = PublisherDto,
> extends BaseModelDto {
  declare id: string
  declare title: string
  declare subtitle: string | null
  declare image: string | null
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
    this.image = book.image
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
  }
}

/**
 * DTO extending common book fields with additional information
 * specific to the full book representation.
 */
export class BookDto extends BookBaseDto {
  declare summary: string | null
  declare description: string | null
  declare tracks: TrackDto[]
  declare createdAt: string
  declare updatedAt: string

  constructor(book?: Book) {
    super(book)
    if (!book) return

    this.contributors = ContributorFullDto.fromArray(book.contributors)

    this.summary = book.summary
    this.description = book.description
    this.tracks = TrackDto.fromArray(book.tracks)
    this.createdAt = book.createdAt.toISO()!
    this.updatedAt = book.updatedAt.toISO()!
  }
}

/**
 * DTO for search results that only require common book fields.
 */
export class SearchBookDto extends BookBaseDto<ContributorBaseDto> {
  constructor(book?: Book) {
    super(book)

    if (!book) return
    this.contributors = ContributorBaseDto.fromArray(book.contributors)
  }
}
