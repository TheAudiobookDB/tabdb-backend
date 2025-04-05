export interface ValidationInterface {
  errors: ValidationError[]
}

export interface ValidationError {
  field: string
  rule: string
  message: string
}
