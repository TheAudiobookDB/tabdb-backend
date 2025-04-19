/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import {
  apiKeyLimiter,
  emailLimiter,
  loginLimiter,
  oneTimeActionLimiter,
  r1Limiter,
  r2Limiter,
  r3Limiter,
} from '#start/limiter'
import { middleware } from '#start/kernel'
import AutoSwagger from 'adonis-autoswagger'
import swagger from '#config/swagger'
import app from '@adonisjs/core/services/app'
const RequestsController = () => import('#controllers/requests_controller')
const ConfirmsController = () => import('#controllers/confirms_controller')
const SearchesController = () => import('#controllers/searches_controller')
const BooksController = () => import('#controllers/books_controller')
const AuthController = () => import('#controllers/auth_controller')
const ContributorsController = () => import('#controllers/contributor_controller')
const SeriesController = () => import('#controllers/series_controller')
const GenresController = () => import('#controllers/genres_controller')
const TracksController = () => import('#controllers/tracks_controller')
const PublishersController = () => import('#controllers/publishers_controller')
const UsersController = () => import('#controllers/users_controller')
const LogsController = () => import('#controllers/logs_controller')

/**
 * Swagger
 */

router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger)
})

router.get('/docs', async () => {
  return AutoSwagger.default.ui('/swagger')
})
router.get('/', async () => {
  return AutoSwagger.default.scalar('/swagger')
})

/**
 * Auth
 */

router.post('/auth/login/:email', [AuthController, 'create']).as('/auth/login').use(r1Limiter)
router.post('/auth/login', [AuthController, 'store']).use(loginLimiter).use(emailLimiter)
router.post('/auth/logout', [AuthController, 'logout']).use(middleware.auth())
router.post('/auth/apiKey', [AuthController, 'apiKey']).use(middleware.auth()).use(apiKeyLimiter)
router
  .get('/auth/checkUsername/:username', [AuthController, 'checkFreeUsername'])
  .use(middleware.auth())
  .use(oneTimeActionLimiter)

/**
 * User
 */
router.get('/user', [UsersController, 'getMe']).use(middleware.auth()).use(r1Limiter)
router.get('/user/:id', [UsersController, 'get']).use(middleware.auth()).use(r1Limiter)
router
  .get('/user/:id/edit-history', [UsersController, 'editHistory'])
  .use(middleware.auth())
  .use(r1Limiter)

router.patch('/user', [UsersController, 'update']).use(middleware.auth()).use(r1Limiter)

/**
 * Book
 */
router.get('/book/:id', [BooksController, 'get']).use(middleware.relaxAuth()).use(r1Limiter)
router
  .get('/book/:id/tracks', [TracksController, 'getTracksForBook'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)
router.post('/book', [BooksController, 'create']).use(middleware.auth()).use(r3Limiter)
router.post('/book/abs', [BooksController, 'abs']).use(middleware.auth()).use(r3Limiter)

/**
 * Contributor
 */
router
  .get('/contributor/:id', [ContributorsController, 'get'])
  .use(middleware.relaxAuth())
  .use(r3Limiter)
router
  .get('/contributor/:id/books', [ContributorsController, 'books'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)
router
  .post('/contributor', [ContributorsController, 'create'])
  .use(middleware.relaxAuth())
  .use(r3Limiter)
router
  .patch('/contributor', [ContributorsController, 'update'])
  .use(middleware.relaxAuth())
  .use(r3Limiter)

/**
 * Series
 */
router.get('/series/:id', [SeriesController, 'get']).use(middleware.relaxAuth()).use(r3Limiter)
router
  .get('/series/:id/books', [SeriesController, 'books'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)

/**
 * Genre
 */
router.get('/genre/:id', [GenresController, 'get']).use(middleware.relaxAuth()).use(r3Limiter)
router
  .get('/genre/:id/books', [GenresController, 'books'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)

/**
 * Tracks
 */
router.get('/track/:id', [TracksController, 'get']).use(middleware.relaxAuth()).use(r3Limiter)

/**
 * Publisher
 */
router
  .get('/publisher/:id', [PublishersController, 'get'])
  .use(middleware.relaxAuth())
  .use(r3Limiter)
router
  .get('/publisher/:id/books', [PublishersController, 'books'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)

/**
 * Search
 */
router.get('/search/book', [SearchesController, 'book']).use(middleware.relaxAuth()).use(r2Limiter)
router
  .get('/search/contributor', [SearchesController, 'contributor'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)
router
  .get('/search/genre', [SearchesController, 'genre'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)
router
  .get('/search/series', [SearchesController, 'series'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)
router
  .get('/search/publisher', [SearchesController, 'publisher'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)

/**
 * Confirm
 */
router.get('/confirm/:id', [ConfirmsController, 'create']).use(middleware.auth()).use(r1Limiter)

/**
 * Request
 */
router.post('/request', [RequestsController, 'index']).use(middleware.relaxAuth()).use(r1Limiter)

router
  .get('/:model/:id/edit-history', [LogsController, 'getEditHistory'])
  .where('model', {
    match: /^(book|contributor|series|genre|publisher)$/,
  })
  .use(middleware.auth())
  .use(r1Limiter)

router.get('/tmp/:file', async (context) => {
  const file = context.request.param('file')

  if (!file) {
    return context.response.status(400).send({
      message: 'No file provided',
    })
  }

  if (file.includes('..')) {
    return context.response.status(400).send({
      message: 'Invalid file path',
    })
  }

  const filePath = app.makePath('storage/uploads', file)
  return context.response.download(filePath)
})
