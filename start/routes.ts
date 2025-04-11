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
const AuthorsController = () => import('#controllers/authors_controller')
const NarratorsController = () => import('#controllers/narrators_controller')
const SeriesController = () => import('#controllers/series_controller')
const GenresController = () => import('#controllers/genres_controller')
const TracksController = () => import('#controllers/tracks_controller')

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

router.post('/login/:email', [AuthController, 'create']).as('/login')
router.post('/login', [AuthController, 'store']).use(loginLimiter).use(emailLimiter)

/**
 * Book
 */
router.get('/book/:id', [BooksController, 'get']).use(middleware.relaxAuth()).use(r1Limiter)
router
  .get('/book/tracks/:id', [TracksController, 'getTracksForBook'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)
router.post('/books', [BooksController, 'create']).use(middleware.relaxAuth()).use(r3Limiter)
router.post('/books/abs', [BooksController, 'abs']).use(middleware.auth()).use(r3Limiter)

/**
 * Author
 */
router.get('/author/:id', [AuthorsController, 'get']).use(middleware.relaxAuth()).use(r3Limiter)
router
  .get('/author/books/:id', [AuthorsController, 'books'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)

/**
 * Narrator
 */
router.get('/narrator/:id', [NarratorsController, 'get']).use(middleware.relaxAuth()).use(r3Limiter)
router
  .get('/narrator/books/:id', [NarratorsController, 'books'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)

/**
 * Series
 */
router.get('/series/:id', [SeriesController, 'get']).use(middleware.relaxAuth()).use(r3Limiter)
router
  .get('/series/books/:id', [SeriesController, 'books'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)

/**
 * Genre
 */
router.get('/genre/:id', [GenresController, 'get']).use(middleware.relaxAuth()).use(r3Limiter)
router
  .get('/genre/books/:id', [GenresController, 'books'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)

/**
 * Tracks
 */
router.get('/track/:id', [TracksController, 'get']).use(middleware.relaxAuth()).use(r3Limiter)

/**
 * Search
 */
router.get('/search/book', [SearchesController, 'book']).use(middleware.relaxAuth()).use(r2Limiter)
router
  .get('/search/author', [SearchesController, 'author'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)
router
  .get('/search/narrator', [SearchesController, 'narrator'])
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

/**
 * Confirm
 */
router.get('/create/confirm', [ConfirmsController, 'create']).use(middleware.auth())

/**
 * Request
 */

router.post('/request', [RequestsController, 'index']).use(middleware.relaxAuth()).use(r1Limiter)
