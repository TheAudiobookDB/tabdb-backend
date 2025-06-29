import { Exception } from '@adonisjs/core/exceptions'

export default class ForbiddenException extends Exception {
  static status = 403
  static code = 'FORBIDDEN_EXCEPTION'
  static message = 'You do not have permission to perform this action.'
}
