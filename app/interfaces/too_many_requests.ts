export interface TooManyRequests {
  errors: TooManyRequestsResponse[]
}

export interface TooManyRequestsResponse {
  message: string
  retryAfter: number
}
