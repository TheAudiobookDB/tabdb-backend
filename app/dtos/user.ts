import { BaseModelDto } from '@adocasts.com/dto/base'
import User from '#models/user'
import { LogFullDto } from '#dtos/log'
import { createdAtApiProperty, nanoIdApiProperty, updatedAtApiProperty } from '#config/openapi'
import { ApiProperty } from '@foadonis/openapi/decorators'
import { UserRoles } from '../enum/user_enum.js'
import { imageApiProperty } from '#dtos/image'
import { DateTime } from 'luxon'

export class UserMinimalDto extends BaseModelDto {
  @nanoIdApiProperty()
  declare id: string

  @ApiProperty({
    type: 'string',
    description: 'The username of the user.',
    example: 'system',
    schema: {
      minLength: 3,
      maxLength: 20,
      format: 'string',
      pattern: '^[a-z0-9_.-]*$',
    },
  })
  declare username: string

  @ApiProperty({
    type: 'string',
    description: 'The email of the user.',
    format: 'email',
    example: 'hello@theaudiobookdb.com',
  })
  declare email: string

  constructor(user?: User) {
    super()
    if (!user) return
    this.id = user.publicId
    this.username = user.username
    this.email = user.email
  }
}

export class UserBaseDto extends UserMinimalDto {
  @ApiProperty({
    type: 'string',
    description: 'The full name of the user.',
    example: 'John Doe',
    nullable: true,
  })
  declare fullName: string | null

  @imageApiProperty('The avatar of the user.')
  declare avatar: object | null

  @ApiProperty({
    type: 'number',
    enum: UserRoles,
    description: 'The role of the user.',
    example: 1,
    nullable: false,
  })
  declare role: number

  constructor(user?: User) {
    super(user)
    if (!user) return
    this.fullName = user.fullName
    this.avatar = user.avatarUrl
    this.role = user.role
  }
}

export class UserFullDto extends UserBaseDto {
  declare logs: LogFullDto[]

  @createdAtApiProperty()
  declare createdAt: string

  @updatedAtApiProperty()
  declare updatedAt: string | null

  constructor(user?: User) {
    super(user)
    if (!user) return
    this.logs = LogFullDto.fromArray(user.logs)
    this.createdAt = user.createdAt.toISO()!
    this.updatedAt = user.updatedAt?.toISO()!
  }
}

export class UserPublicDto extends BaseModelDto {
  @ApiProperty({
    type: 'string',
    description: 'The username of the user.',
    example: 'system',
    schema: {
      minLength: 3,
      maxLength: 20,
      format: 'string',
      pattern: '^[a-z0-9_.-]*$',
    },
  })
  declare id: string

  @ApiProperty({
    type: 'string',
    description: 'The username of the user.',
    example: 'system',
    schema: {
      minLength: 3,
      maxLength: 20,
      format: 'string',
      pattern: '^[a-z0-9_.-]*$',
    },
  })
  declare username: string

  @imageApiProperty('The avatar of the user')
  declare avatar: object | null

  constructor(user?: User) {
    super()
    if (!user) return
    this.id = user.publicId
    this.username = user.username ?? 'Error'
    this.avatar = user.avatarUrl
  }
}

export class UserTokenDto extends BaseModelDto {
  @ApiProperty({
    type: 'string',
    description: 'The type of the token. Always bearer.',
    example: 'bearer',
    default: 'bearer',
    enum: ['bearer'],
  })
  declare type: string

  @ApiProperty({
    type: 'string',
    description:
      'An identifier for the token that is used to prevent duplicates. Cannot be used for anything else.',
    example: '8e5bc35c-5622-454e-810a-d6b72d108249',
    format: 'uuid',
  })
  declare name: string

  @ApiProperty({
    type: 'string',
    description: 'The token that is used to authenticate the user.',
  })
  declare token: string

  @ApiProperty({
    type: ['string'],
    description: 'The abilities of the token.',
  })
  declare abilities: string[]

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'The date and time when the token was last used.',
    example: '2023-10-01T00:00:00Z',
    nullable: true,
  })
  declare lastUsed: DateTime | null

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'The date and time when the token expires.',
    example: '2023-10-01T00:00:00Z',
    nullable: true,
  })
  declare expiresAt: DateTime | null

  constructor(user?: any) {
    super()
    if (!user) return
    this.type = user.type
    this.name = user.name
    this.token = user.value.release()
    this.abilities = user.abilities
    this.lastUsed = user.lastUsed
    this.expiresAt = user.expiresAt
  }
}

export class UserLoginDto extends BaseModelDto {
  @ApiProperty()
  declare user: UserBaseDto

  @ApiProperty()
  declare token: UserTokenDto

  constructor(user?: User, token?: any) {
    super()
    if (!user) return
    this.user = new UserBaseDto(user)
    this.token = new UserTokenDto(token)
  }
}
