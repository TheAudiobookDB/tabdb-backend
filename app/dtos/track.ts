import { BaseModelDto } from '@adocasts.com/dto/base'
import Track from '#models/track'
import { BookDto } from '#dtos/book'
import { ContributorMinimalDto } from '#dtos/contributor'
import { ImageBaseDto } from '#dtos/image'

export class TrackMinimalDto extends BaseModelDto {
  declare id: string
  declare name: string

  constructor(track?: Track) {
    super()
    if (!track) return
    this.id = track.publicId
    this.name = track.name
  }
}

export class TrackBaseDto extends TrackMinimalDto {
  declare start: number
  declare end: number
  declare duration: number
  declare contributors: ContributorMinimalDto[]
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
  declare createdAt: string
  declare updatedAt: string
  declare book: BookDto | null

  constructor(track?: Track, bookDto: { new (book?: any): BookDto } = BookDto) {
    super(track)
    if (!track) return
    this.book = track.book ? new bookDto(track.book) : null
    this.createdAt = track.createdAt.toISO()!
    this.updatedAt = track.updatedAt.toISO()!
  }
}
