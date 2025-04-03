/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { emailLimiter, loginLimiter, r1Limiter, r3Limiter } from '#start/limiter'
import { middleware } from '#start/kernel'
import AutoSwagger from 'adonis-autoswagger'
import swagger from '#config/swagger'
const BooksController = () => import('#controllers/books_controller')
const AuthController = () => import('#controllers/auth_controller')

router
  .get('/', async () => {
    return {
      hello: 'world',
    }
  })
  .use(middleware.relaxAuth())
  .use(r3Limiter)

/**
 * Swagger
 */

router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger)
})

router.get('/docs', async () => {
  return AutoSwagger.default.ui('/swagger')
})

/**
 * Auth
 */

router.get('/login/:email', [AuthController, 'create']).as('/login')
router.post('/login', [AuthController, 'store']).use(loginLimiter).use(emailLimiter)

/**
 * Book
 */
router.post('/book/:id', [BooksController, 'get']).use(middleware.relaxAuth()).use(r1Limiter)
router.post('/books', [BooksController, 'create']).use(middleware.auth()).use(r3Limiter)
