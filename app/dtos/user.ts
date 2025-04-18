import { BaseModelDto } from '@adocasts.com/dto/base'
import User from '#models/user'
import { LogFullDto } from '#dtos/log'

export class UserMinimalDto extends BaseModelDto {
  declare id: string
  declare fullName: string | null
  declare email: string

  constructor(user?: User) {
    super()
    if (!user) return
    this.id = user.publicId
    this.fullName = user.fullName
    this.email = user.email
  }
}

export class UserBaseDto extends UserMinimalDto {
  declare username: string | null
  declare avatar: string | null
  declare avatarUrl: object
  declare role: number

  constructor(user?: User) {
    super(user)
    if (!user) return
    this.username = user.username
    this.avatar = user.avatar
    this.avatarUrl = user.avatarUrl
    this.role = user.role
  }
}

export class UserFullDto extends UserBaseDto {
  declare logs: LogFullDto[]
  declare createdAt: string
  declare updatedAt: string | null

  constructor(user?: User) {
    super(user)
    if (!user) return
    this.logs = LogFullDto.fromArray(user.logs)
    this.createdAt = user.createdAt.toISO()!
    this.updatedAt = user.updatedAt?.toISO()!
  }
}
