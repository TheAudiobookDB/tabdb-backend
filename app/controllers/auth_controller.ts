import { HttpContext } from '@adonisjs/core/http'
import { storeLoginValidator } from '#validators/auth_validator'
import router from '@adonisjs/core/services/router'
import User from '#models/user'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import { randomUUID } from 'node:crypto'

export default class AuthController {
  /**
   * @index
   * @operationId login
   * @description Logs in a user when clicking on the link in the email sent
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
        .htmlView('email/login_email', { login_url: url })
    })

    return null
  }

  /**
   * @create
   * @operationId login
   * @description Logs in a user when clicking on the link in the email sent
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

      return {
        user,
        token: await User.accessTokens.create(
          user,
          ['rate1:150', 'rate2:50', 'rate3:10', 'server:add'],
          {
            name: uuid,
          }
        ),
      }
    } else {
      return response.badRequest('Expired or invalid token')
    }
  }
}
