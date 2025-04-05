/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { emailLimiter, loginLimiter, r1Limiter, r2Limiter, r3Limiter } from '#start/limiter'
import { middleware } from '#start/kernel'
import AutoSwagger from 'adonis-autoswagger'
import swagger from '#config/swagger'
const RequestsController = () => import('#controllers/requests_controller')
const ConfirmsController = () => import('#controllers/confirms_controller')
const SearchesController = () => import('#controllers/searches_controller')
const BooksController = () => import('#controllers/books_controller')
const AuthController = () => import('#controllers/auth_controller')

/**
 * Swagger
 */

router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger)
})

router.get('/docs', async () => {
  return AutoSwagger.default.scalar('/swagger')
})

/**
 * Auth
 */

router.get('/login/:email', [AuthController, 'create']).as('/login')
router.post('/login', [AuthController, 'store']).use(loginLimiter).use(emailLimiter)

/**
 * Book
 */
router.get('/book/:id', [BooksController, 'get']).use(middleware.relaxAuth()).use(r1Limiter)
router.post('/books', [BooksController, 'create']).use(middleware.auth()).use(r3Limiter)

/**
 * Search
 */
router.get('/search/book', [SearchesController, 'book']).use(middleware.relaxAuth()).use(r2Limiter)

/**
 * Confirm
 */
router.get('/create/confirm', [ConfirmsController, 'create']).use(middleware.auth())

/**
 * Request
 */

router.post('/request', [RequestsController, 'index']).use(middleware.relaxAuth()).use(r1Limiter)
