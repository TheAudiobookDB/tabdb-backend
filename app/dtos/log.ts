import { BaseModelDto } from '@adocasts.com/dto/base'
import Log from '#models/log'
import { UserMinimalDto } from '#dtos/user'
import { UserFullDto } from '#dtos/user'
import { LogAction, LogModel, LogState } from '../enum/log_enum.js'

export class LogMinimalDto extends BaseModelDto {
  declare id: string
  declare action: LogAction
  declare model: LogModel

  constructor(log?: Log) {
    super()
    if (!log) return
    this.id = log.publicId
    this.action = log.action
    this.model = log.model
  }
}

export class LogBaseDto extends BaseModelDto {
  declare id: string
  declare action: LogAction
  declare model: LogModel
  declare modelId: string | undefined
  declare data: object | object[] | undefined
  declare userId: number
  declare state: LogState | undefined
  declare user: UserMinimalDto | null

  constructor(log?: Log, userDto: { new (user?: any): UserMinimalDto } = UserMinimalDto) {
    super()
    if (!log) return
    this.id = log.publicId
    this.action = log.action
    this.model = log.model
    this.modelId = log.modelId
    this.data = log.data
    this.userId = log.userId
    this.state = log.state
    this.user = log.user ? new userDto(log.user) : null
  }
}

export class LogFullDto extends LogBaseDto {
  declare createdAt: string
  declare updatedAt: string

  constructor(log?: Log, userDto: { new (user?: any): UserFullDto } = UserFullDto) {
    super(log, userDto)
    if (!log) return
    this.createdAt = log.createdAt.toISO()!
    this.updatedAt = log.updatedAt.toISO()!
  }
}
