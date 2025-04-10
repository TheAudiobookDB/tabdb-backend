import { HttpContext } from '@adonisjs/core/http'
import { storeLoginValidator } from '#validators/auth_validator'
import router from '@adonisjs/core/services/router'
import User from '#models/user'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import { randomUUID } from 'node:crypto'

export default class AuthController {
  /**
   * @store
   * @operationId login
   * @summary Sends an email to the user with a link to log in
   * @description Sends an email to the user with a link to log in
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   *
   * @responseBody 200 - {"message": "Email sent successfully"}
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async store({ request }: HttpContext) {
    await storeLoginValidator.validate(request.all())

    const { email } = request.all()

    const url = router
      .builder()
      .prefixUrl(env.get('APP_URL'))
      .params({ email: email })
      .qs({ uuid: randomUUID() })
      .makeSigned('/login', { expiresIn: '5m', purpose: 'login' })

    await mail.send((message) => {
      message
        .to(email)
        .subject('Login to AudiobookDB')
        .header('X-PM-Message-Stream', 'outbound')
        .htmlView('email/login_email', { login_url: url })
    })

    return {
      message: 'Email sent successfully',
    }
  }

  /**
   * @create
   * @operationId confirmLogin
   * @summary Confirms the login
   * @description Creates a new user if it does not exist and creates a new token for the user
   *
   * @responseBody 200 - <AccessTokenInterface>
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async create({ request, response }: HttpContext) {
    if (request.hasValidSignature('login')) {
      const email = request.param('email')
      const { uuid } = request.qs()

      let user = await User.findBy('email', email)

      if (!user) {
        user = new User()
        user.email = email
        await user.save()
      }

      const tokens = await User.accessTokens.all(user)

      if (tokens.find((token) => token.name === uuid)) {
        return response.badRequest('Token already exists')
      }

      return await User.accessTokens.create(
        user,
        ['rate1:150', 'rate2:50', 'rate3:10', 'server:add'],
        {
          name: uuid,
        }
      )
    } else {
      return response.badRequest('Expired or invalid token')
    }
  }
}
