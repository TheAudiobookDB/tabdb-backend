import { BaseModelDto } from '@adocasts.com/dto/base'
import Track from '#models/track'
import { ContributorMinimalDto } from '#dtos/contributor'
import { ImageBaseDto } from '#dtos/image'
import { createdAtApiProperty, nanoIdApiProperty, updatedAtApiProperty } from '#config/openapi'
import { ApiProperty, ApiPropertyOptional } from '@foadonis/openapi/decorators'

export class TrackMinimalDto extends BaseModelDto {
  @nanoIdApiProperty()
  declare id: string

  @ApiProperty({
    type: 'string',
    description: 'The name of the track.',
    example: 'Sample Track Name',
  })
  declare name: string

  constructor(track?: Track) {
    super()
    if (!track) return
    this.id = track.publicId
    this.name = track.name
  }
}

export class TrackBaseDto extends TrackMinimalDto {
  @ApiProperty({
    type: 'number',
    description: 'The start time of the track in milliseconds.',
    example: 0,
  })
  declare start: number

  @ApiProperty({
    type: 'number',
    description: 'The end time of the track in milliseconds.',
    example: 0,
  })
  declare end: number

  @ApiProperty({
    type: 'number',
    description:
      'The duration of the track in milliseconds. This is the difference between start and end and autogenerated.',
    example: 0,
  })
  declare duration: number

  @ApiPropertyOptional({
    type: () => [ContributorMinimalDto],
    description: 'List of contributors associated with the track.',
    nullable: true,
  })
  declare contributors: ContributorMinimalDto[]

  @ApiPropertyOptional({
    type: () => [ImageBaseDto],
    description:
      'List of images associated with the track. Images should be considered optional and only be loaded upon user-interaction.',
    nullable: true,
  })
  declare images: ImageBaseDto[]

  constructor(track?: Track) {
    super(track)
    if (!track) return
    this.start = track.start
    this.end = track.end
    this.duration = track.duration
    if (track.contributors) {
      this.contributors = track.contributors.map(
        (contributor) => new ContributorMinimalDto(contributor)
      )
    }
    if (track.images) this.images = ImageBaseDto.fromArray(track.images)
  }
}

export class TrackFullDto extends TrackBaseDto {
  @createdAtApiProperty()
  declare createdAt: string

  @updatedAtApiProperty()
  declare updatedAt: string

  constructor(track?: Track) {
    super(track)
    if (!track) return
    this.createdAt = track.createdAt.toISO()!
    this.updatedAt = track.updatedAt.toISO()!
  }
}
