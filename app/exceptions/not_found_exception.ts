import { Exception } from '@adonisjs/core/exceptions'

export default class NotFoundException extends Exception {
  static status = 404
  static message = 'Resource not found'
  static code = 'E_NOT_FOUND'
}
