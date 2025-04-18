import { BaseModelDto } from '@adocasts.com/dto/base'
import User from '#models/user'
import LogDto from '#dtos/log'

export default class UserDto extends BaseModelDto {
  declare id: string
  declare fullName: string | null
  declare email: string
  declare username: string | null
  declare avatar: string | null
  declare avatarUrl: object
  declare role: number
  declare logs: LogDto[]
  declare createdAt: string
  declare updatedAt: string | null

  constructor(user?: User) {
    super()

    if (!user) return
    this.id = user.publicId
    this.username = user.username
    this.avatarUrl = user.avatarUrl
    this.role = user.role
    this.logs = LogDto.fromArray(user.logs)
    this.createdAt = user.createdAt.toISO()!
    this.updatedAt = user.updatedAt?.toISO()!
  }
}
