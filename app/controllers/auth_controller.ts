import { HttpContext } from '@adonisjs/core/http'
import { storeLoginValidator, usernameValidator } from '#validators/auth_validator'
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
  async store({ request, response }: HttpContext) {
    await storeLoginValidator.validate(request.all())

    const { email, username } = request.all()

    const user = await User.findBy('email', email)
    if (!user && !username) {
      return response.notFound({
        message: 'You must provide a username to create a new user',
      })
    }

    const url = router
      .builder()
      .prefixUrl(env.get('APP_URL'))
      .params({ email: email })
      .qs({ uuid: randomUUID(), ...(username ? { username: username } : {}) })
      .makeSigned('/auth/login', { expiresIn: '5m', purpose: 'login' })

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
      const { uuid, username } = request.qs()

      let user = await User.findBy('email', email)

      let existingUser = await User.findBy('username', username)
      if (existingUser) {
        return response.badRequest({
          message: 'Username is already taken',
        })
      }

      if (!user) {
        if (!username) {
          return response.badRequest({
            message: 'Username is required for creating a new user',
          })
        }
        user = new User()
        user.email = email
        user.username = username

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

  /**
   * @logout
   * @operationId logout
   * @summary Logs out the user
   *
   * @responseBody 422 - <ValidationInterface>
   * @responseBody 429 - <TooManyRequests>
   */
  async logout({ auth }: HttpContext) {
    const user = auth.user
    if (!user) {
      throw new Error('Unauthorized')
    }

    await User.accessTokens.delete(user, user.currentAccessToken.identifier)

    return {
      message: 'Logged out successfully',
    }
  }

  /**
   * @apiKey
   * @operationId generateApiKey
   * @summary Generates a new API key for the user
   * @description Generates a new API key for the user
   *
   * @responseBody 200 - <AccessTokenInterface>
   */
  async apiKey({ auth }: HttpContext) {
    const user = auth.user
    if (!user) {
      throw new Error('Unauthorized')
    }

    return await User.apiTokens.create(user, user.currentAccessToken.abilities, {
      name: randomUUID(),
      expiresIn: '1y',
    })
  }

  /**
   * @checkFreeUsername
   * @operationId checkFreeUsername
   * @summary Checks if the username is free
   * @description Checks if the username is free
   *
   * @responseHeader 200 - @use(rate)
   * @responseHeader 200 - @use(requestId)
   */
  async checkFreeUsername({ request, response }: HttpContext) {
    await usernameValidator.validate(request.params())
    const username = request.param('username')

    const user = await User.findBy('username', username)
    if (user) {
      return response.badRequest({
        message: 'Username is already taken',
      })
    }

    return response.ok({
      message: 'Username is available',
    })
  }
}
