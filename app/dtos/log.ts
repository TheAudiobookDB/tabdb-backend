import { BaseModelDto } from '@adocasts.com/dto/base'
import Log from '#models/log'
import { LogAction, LogModel, LogState } from '../enum/log_enum.js'
import UserDto from '#dtos/user'

export default class LogDto extends BaseModelDto {
  declare id: string
  declare action: LogAction
  declare model: LogModel
  declare modelId: string | undefined
  declare data: object | object[] | undefined
  declare userId: number
  declare state: LogState | undefined
  declare user: UserDto | null
  declare createdAt: string
  declare updatedAt: string

  constructor(log?: Log) {
    super()

    if (!log) return
    this.id = log.publicId
    this.action = log.action
    this.model = log.model
    this.modelId = log.modelId
    this.data = log.data
    this.userId = log.userId
    this.state = log.state
    this.user = log.user && new UserDto(log.user)
    this.createdAt = log.createdAt.toISO()!
    this.updatedAt = log.updatedAt.toISO()!
  }
}
