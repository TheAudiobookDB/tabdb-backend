import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidUserAgentException extends Exception {
  static status = 401
  static code = 'E_INVALID_USER_AGENT'
  static message = 'You provided an invalid User-Agent. An empty User-Agent is not allowed.'
}
