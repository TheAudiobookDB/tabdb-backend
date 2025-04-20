import { Exception } from '@adonisjs/core/exceptions'

export class ProviderNotFoundException extends Exception {
  static status = 404
  static code = 'E_PROVIDER_NOT_FOUND'
  static message = 'The requested resource was not found.'
}

export class ProviderErrorException extends Exception {
  static status = 500
  static message = 'An error occurred while processing the request.'
  static code = 'E_PROVIDER_ERROR'
}
