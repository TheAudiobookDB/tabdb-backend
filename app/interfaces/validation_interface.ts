export interface ValidationInterface {
  errors: ValidationError[]
}

export interface ValidationError {
  field: string
  rule: string
  message: string
}

/**
 * @description Validation error response
 */
export interface RequestResponse {
  message: string
  id: string
}
