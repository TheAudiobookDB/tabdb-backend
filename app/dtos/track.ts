import { BaseModelDto } from '@adocasts.com/dto/base'
import Track from '#models/track'
import { BookDto } from '#dtos/book'

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
  declare bookId: number
  declare book: BookDto | null

  constructor(track?: Track, bookDto: { new (book?: any): BookDto } = BookDto) {
    super(track)
    if (!track) return
    this.start = track.start
    this.end = track.end
    this.duration = track.duration
    this.bookId = track.bookId
    this.book = track.book ? new bookDto(track.book) : null
  }
}

export class TrackFullDto extends TrackBaseDto {
  declare createdAt: string
  declare updatedAt: string

  constructor(track?: Track, bookDto: { new (book?: any): BookDto } = BookDto) {
    super(track, bookDto)
    if (!track) return
    this.createdAt = track.createdAt.toISO()!
    this.updatedAt = track.updatedAt.toISO()!
  }
}
