import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { Secret } from '@adonisjs/core/helpers'
import { defineConfig } from '@adonisjs/core/http'
import { customAlphabet } from 'nanoid'
import vine from '@vinejs/vine'
import { isLanguageRule } from '#start/rules/language'
import Cloudflare from 'cloudflare'

/**
 * The app key is used for encrypting cookies, generating signed URLs,
 * and by the "encryption" module.
 *
 * The encryption module will fail to decrypt data if the key is lost or
 * changed. Therefore it is recommended to keep the app key secure.
 */
export const appKey = new Secret(env.get('APP_KEY'))

/**
 * The configuration settings used by the HTTP server
 */
export const http = defineConfig({
  generateRequestId: true,
  allowMethodSpoofing: false,

  /**
   * Enabling async local storage will let you access HTTP context
   * from anywhere inside your application.
   */
  useAsyncLocalStorage: true,

  /**
   * Manage cookies configuration. The settings for the session id cookie are
   * defined inside the "config/session.ts" file.
   */
  cookie: {
    domain: '',
    path: '/',
    maxAge: '2h',
    httpOnly: true,
    secure: app.inProduction,
    sameSite: 'lax',
  },
})

export const cloudflareClient = new Cloudflare({
  apiToken: env.get('CF_AUTH'),
})

export const imageTypes: string[] = ['thumb', 'small', 'medium', 'large']

/**
 * The configuration for nanoId
 */
export const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)

export const nanoIdValidation = vine
  .string()
  .regex(RegExp('^[a-zA-Z0-9_-]{16}$'))
  .transform((value) => value.toLowerCase())

export const languageValidation = vine.string().use(isLanguageRule({}))

export const pageValidation = vine
  .number()
  .positive()
  .withoutDecimals()
  .max(20)
  .min(1)
  .parse((v) => v || 1)
  .optional()
  .transform((v) => v || 1)
export const limitValidation = vine
  .number()
  .positive()
  .withoutDecimals()
  .max(50)
  .min(1)
  .parse((v) => {
    return v || 10
  })
  .optional()
  .transform((v) => v || 10)
