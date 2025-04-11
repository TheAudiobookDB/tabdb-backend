import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

const mailConfig = defineConfig({
  default: 'smtp',

  /**
   * The mailers object can be used to configure multiple mailers
   * each using a different transport or same transport with different
   * options.
   */

  from: {
    address: env.get('SMTP_FROM', ''),
    name: 'The Audiobook DB',
  },

  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST'),
      port: env.get('SMTP_PORT'),
      requireTLS: true,
      auth: {
        type: 'login',
        user: env.get('SMTP_USER', ''),
        pass: env.get('SMTP_PASS', ''),
      },
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
