/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  APP_URL: Env.schema.string({ format: 'url' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the limiter package
  |----------------------------------------------------------
  */
  LIMITER_STORE: Env.schema.enum(['database', 'memory', 'redis'] as const),

  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string(),

  MEILISEARCH_HOST: Env.schema.string(),
  MEILISEARCH_API_KEY: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the mail package
  |----------------------------------------------------------
  */
  SMTP_HOST: Env.schema.string(),
  SMTP_PORT: Env.schema.string(),
  SMTP_FROM: Env.schema.string(),
  SMTP_USER: Env.schema.string(),
  SMTP_PASS: Env.schema.string(),

  AXIOM_DATASET: Env.schema.string.optional(),
  AXIOM_TOKEN: Env.schema.string.optional(),

  CDN_HOST: Env.schema.string(),

  CDN_ZONE: Env.schema.string(),

  CDN_KEY: Env.schema.string(),

  CDN_IMAGE_HOST: Env.schema.string(),

  CDN_PROCESS_HOST: Env.schema.string(),

  CDN_IMAGE_CLIENT_ID: Env.schema.string(),

  CDN_IMAGE_SECRET: Env.schema.string(),

  CDN_SERVE_HOST: Env.schema.string(),

  EXPERIMENTAL_DOWNLOAD: Env.schema.boolean(),

  BUNNY_KEY: Env.schema.string(),

  CF_ZONE: Env.schema.string(),

  CF_AUTH: Env.schema.string(),

  CF_EMAIL: Env.schema.string(),

  SEED_NUM: Env.schema.number.optional(),
})
