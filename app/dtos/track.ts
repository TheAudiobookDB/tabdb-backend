import { BaseModelDto } from '@adocasts.com/dto/base'
import Track from '#models/track'
import BookDto from '#dtos/book'

export default class TrackDto extends BaseModelDto {
  declare id: string
  declare name: string
  declare start: number
  declare end: number
  declare duration: number
  declare bookId: number
  declare book: BookDto | null
  declare createdAt: string
  declare updatedAt: string

  constructor(track?: Track) {
    super()

    if (!track) return
    this.id = track.publicId
    this.name = track.name
    this.start = track.start
    this.end = track.end
    this.duration = track.duration
    this.bookId = track.bookId
    this.book = track.book && new BookDto(track.book)
    this.createdAt = track.createdAt.toISO()!
    this.updatedAt = track.updatedAt.toISO()!
  }
}
