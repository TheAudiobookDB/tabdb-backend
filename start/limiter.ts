/*
|--------------------------------------------------------------------------
| Define HTTP limiters
|--------------------------------------------------------------------------
|
| The "limiter.define" method creates an HTTP middleware to apply rate
| limits on a route or a group of routes. Feel free to define as many
| throttle middleware as needed.
|
*/

import limiter from '@adonisjs/limiter/services/main'
import { UserAbilities } from '../app/enum/user_enum.js'

export const emailLimiter = limiter.define('login_email', (ctx) => {
  /**
   * A login request is only allowed 1 per 5 minutes per email
   */
  const { email } = ctx.request.all()

  if (email !== undefined) {
    return limiter.allowRequests(2).every('5 minutes').usingKey(`login_email_${email}`)
  }

  return limiter.noLimit()
})

export const loginLimiter = limiter.define('login', (ctx) => {
  /**
   * A login request is only allowed 10 per minute
   */
  return limiter
    .allowRequests(5)
    .every('5 minutes')
    .usingKey(`login_${ctx.request.ip()}`)
    .blockFor('1 hour')
})

export const r1Limiter = limiter.define('rate1', (ctx) => {
  const user = ctx.auth.user
  if (user) {
    const abilities: UserAbilities = new UserAbilities(user.currentAccessToken.abilities)

    const rate = abilities.getRate(1)
    if (rate) {
      return limiter
        .allowRequests(rate)
        .every('1 minute')
        .usingKey(`rate1_${ctx.request.ip()}`)
        .blockFor('1 minute')
    }
  }

  return limiter
    .allowRequests(100)
    .every('1 minute')
    .usingKey(`rate1_${ctx.request.ip()}`)
    .blockFor('1 minute')
})

export const r2Limiter = limiter.define('rate2', (ctx) => {
  const user = ctx.auth.user
  if (user) {
    const abilities: UserAbilities = new UserAbilities(user.currentAccessToken.abilities)

    const rate = abilities.getRate(2)
    if (rate) {
      return limiter
        .allowRequests(rate)
        .every('1 minute')
        .usingKey(`rate2_${ctx.request.ip()}`)
        .blockFor('1 minute')
    }
  }

  return limiter
    .allowRequests(30)
    .every('1 minute')
    .usingKey(`rate2_${ctx.request.ip()}`)
    .blockFor('1 minute')
})

export const r3Limiter = limiter.define('rate3', (ctx) => {
  const user = ctx.auth.user
  if (user) {
    const abilities: UserAbilities = new UserAbilities(user.currentAccessToken.abilities)

    const rate = abilities.getRate(3)
    if (rate) {
      return limiter
        .allowRequests(rate)
        .every('1 minute')
        .usingKey(`rate3_${ctx.request.ip()}`)
        .blockFor('1 minute')
    }
  }

  return limiter
    .allowRequests(5)
    .every('1 minute')
    .usingKey(`rate3_${ctx.request.ip()}`)
    .blockFor('1 minute')
})

export const apiKeyLimiter = limiter.define('apiKey', (ctx) => {
  const user = ctx.auth.user

  // This is never the case
  if (!user) {
    return limiter.allowRequests(0)
  }

  return limiter.allowRequests(1).every('1 day').usingKey(`apiKey_${user.id}`)
})

export const oneTimeActionLimiter = limiter.define('oneTimeAction', (ctx) => {
  return limiter
    .allowRequests(25)
    .every('24 hour')
    .usingKey(`oneTimeAction_${ctx.request.ip()}`)
    .blockFor('7 day')
})
