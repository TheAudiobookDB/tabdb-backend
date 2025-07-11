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
import openapi from '@foadonis/openapi/services/main'
import app from '@adonisjs/core/services/app'
import { HttpContext } from '@adonisjs/core/http'
import path from 'node:path'
import { stat } from 'node:fs/promises'

openapi.registerRoutes()

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
const ImagesController = () => import('#controllers/images_controller')
const AdminController = () => import('#controllers/admin_controller')

/**
 * Swagger
 */

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
router.delete('/user/:id', [UsersController, 'delete']).use(middleware.auth()).use(r1Limiter)

/**
 * Book
 */
router.get('/book', [BooksController, 'getMultiple']).use(middleware.relaxAuth()).use(r2Limiter)
router
  .get('/book/:id/images', [BooksController, 'images'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)
router
  .get('/book/:id/tracks', [TracksController, 'getTracksForBook'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)
router.get('/book/:id', [BooksController, 'get']).use(middleware.relaxAuth()).use(r1Limiter)
router.post('/book', [BooksController, 'create']).use(middleware.auth()).use(r3Limiter)
// TODO
//router.post('/book/merge', [BooksController, 'merge']).use(middleware.auth()).use(r3Limiter)
// router.post('/book/abs', [BooksController, 'abs']).use(middleware.auth()).use(r3Limiter)
router.delete('/book/:id', [BooksController, 'delete']).use(middleware.auth()).use(r3Limiter)

/**
 * Contributor
 */
router
  .get('/contributor/:id', [ContributorsController, 'get'])
  .use(middleware.relaxAuth())
  .use(r1Limiter)
router
  .get('/contributor', [ContributorsController, 'getMultiple'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)
router
  .get('/contributor/:id/books', [ContributorsController, 'books'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)
router
  .post('/contributor', [ContributorsController, 'create'])
  .use(middleware.auth())
  .use(r3Limiter)
router
  .delete('/contributor/:id', [ContributorsController, 'delete'])
  .use(middleware.auth())
  .use(r3Limiter)

/**
 * Series
 */
router.get('/series/:id', [SeriesController, 'get']).use(middleware.relaxAuth()).use(r1Limiter)
router.get('/series', [SeriesController, 'getMultiple']).use(middleware.relaxAuth()).use(r2Limiter)
router
  .get('/series/:id/books', [SeriesController, 'books'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)
router.post('/series', [SeriesController, 'create']).use(middleware.auth()).use(r3Limiter)
router.delete('/series/:id', [SeriesController, 'delete']).use(middleware.auth()).use(r3Limiter)

/**
 * Genre
 */
router.get('/genre/:id', [GenresController, 'get']).use(middleware.relaxAuth()).use(r1Limiter)
router.get('/genre', [GenresController, 'getMultiple']).use(middleware.relaxAuth()).use(r2Limiter)
router
  .get('/genre/:id/books', [GenresController, 'books'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)
router.post('/genre', [GenresController, 'create']).use(middleware.auth()).use(r3Limiter)
router.delete('/genre/:id', [GenresController, 'delete']).use(middleware.auth()).use(r3Limiter)

/**
 * Tracks
 */
router.get('/track/:id', [TracksController, 'get']).use(middleware.relaxAuth()).use(r1Limiter)
router.delete('/track/:id', [TracksController, 'delete']).use(middleware.auth()).use(r3Limiter)

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
router.post('/publisher', [PublishersController, 'create']).use(middleware.auth()).use(r3Limiter)
router
  .delete('/publisher/:id', [PublishersController, 'delete'])
  .use(middleware.auth())
  .use(r3Limiter)

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
router
  .post('/confirm/:model', [ConfirmsController, 'create'])
  .use(middleware.auth())
  .use(r1Limiter)
  .where('model', {
    match: /^(book|contributor|series|genre|publisher|group)$/,
  })

/**
 * Request
 */
router.post('/request', [RequestsController, 'index']).use(middleware.relaxAuth()).use(r1Limiter)
router.post('/image', [ImagesController, 'uploadImage']).use(middleware.auth()).use(r2Limiter)
router.delete('/image/:id', [ImagesController, 'delete']).use(middleware.auth()).use(r2Limiter)

/**
 * Admin
 */
router
  .post('/admin/cleanup/orphaned-images', [AdminController, 'cleanupOrphanedImages'])
  .use(middleware.auth())
  .use(r2Limiter)
router
  .post('/admin/cleanup/unused-entities', [AdminController, 'cleanupUnusedEntities'])
  .use(middleware.auth())
  .use(r2Limiter)
router
  .post('/admin/restore/book/:id', [AdminController, 'restoreBook'])
  .use(middleware.auth())
  .use(r2Limiter)

router.get('/tmp/:file', async ({ params, response }: HttpContext) => {
  const uploadsPath = app.makePath('storage/uploads')

  const filePath = path.join(uploadsPath, params.file)

  if (!filePath.startsWith(uploadsPath)) {
    return response.badRequest({ message: 'Invalid file path' })
  }

  try {
    await stat(filePath)
  } catch (error) {
    return response.notFound({ message: 'File not found' })
  }

  return response.download(filePath)
})

// TODO: Remove this endpoint in the future, use /tmp/:file instead
router.get('/tmp/temp/:file', async ({ params, response }: HttpContext) => {
  const uploadsPath = app.makePath('storage/uploads/temp')

  const filePath = path.join(uploadsPath, params.file)

  console.log('File path:', filePath)

  if (!filePath.startsWith(uploadsPath)) {
    return response.badRequest({ message: 'Invalid file path' })
  }

  try {
    await stat(filePath)
  } catch (error) {
    return response.notFound({ message: 'File not found' })
  }

  return response.download(filePath)
})
