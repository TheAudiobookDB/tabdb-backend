import { ApiProperty } from '@foadonis/openapi/decorators'
import { SearchBookDto } from '#dtos/book'
import { ContributorBaseDto } from '#dtos/contributor'
import { GenreBaseDto } from '#dtos/genre'
import { SeriesBaseDto } from '#dtos/series'
import { PublisherMinimalDto } from '#dtos/publisher'

export class PaginatedResponseMeta {
  @ApiProperty({
    type: 'integer',
    description:
      'The total number of items in the collection. May max out at 1000 even if there are more items. You can only retrieve the first 500 items. To get more items, please contact us.',
    example: 100,
  })
  declare total: number

  @ApiProperty({
    type: 'integer',
    description: 'The number of items per page.',
    example: 10,
    minimum: 1,
    maximum: 500,
  })
  declare perPage: number

  @ApiProperty({
    type: 'integer',
    description: 'The current page number.',
    example: 1,
    minimum: 1,
    maximum: 500,
  })
  declare currentPage: number

  @ApiProperty({
    type: 'integer',
    description: 'The total number of pages.',
    example: 10,
    minimum: 1,
    maximum: 500,
  })
  declare lastPage: number

  @ApiProperty({
    type: 'integer',
    description: 'The first page number.',
    example: 1,
    default: 1,
    maximum: 1,
  })
  declare firstPage: number

  @ApiProperty({
    type: 'string',
    description: 'The URL of the first page.',
    example: '/?page=1',
    default: '/?page=1',
  })
  declare firstPageUrl: string

  @ApiProperty({
    type: 'string',
    description: 'The URL of the last page.',
    example: '/?page=10',
  })
  declare lastPageUrl: string

  @ApiProperty({
    type: 'string',
    description: 'The URL of the next page.',
    example: '/?page=2',
    nullable: true,
  })
  declare nextPageUrl?: string

  @ApiProperty({
    type: 'string',
    description: 'The URL of the previous page.',
    example: '/?page=10',
    nullable: true,
  })
  declare previousPageUrl?: string
}

export default function PaginatedResponse<TItem extends object>(
  Item: new (...args: any[]) => TItem
) {
  abstract class Pagination {
    @ApiProperty()
    declare meta: PaginatedResponseMeta

    @ApiProperty({ type: [Item] })
    declare items: TItem[]
  }
  return Pagination
}

// Pagination

export class SearchBookDtoPaginated extends PaginatedResponse(SearchBookDto) {}
export class SeriesBaseDtoPaginated extends PaginatedResponse(SeriesBaseDto) {}
export class GenreBaseDtoPaginated extends PaginatedResponse(GenreBaseDto) {}
export class ContributorBaseDtoPaginated extends PaginatedResponse(ContributorBaseDto) {}
export class PublisherMinimalDtoPaginated extends PaginatedResponse(PublisherMinimalDto) {}
