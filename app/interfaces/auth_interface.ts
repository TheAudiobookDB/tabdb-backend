export interface AccessTokenInterface {
  type: string
  name?: string
  token: string
  abilities: string[]
  lastUsedAt?: Date
  expiredAt?: Date
}
