import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, targets } from '@adonisjs/core/logger'

const loggerConfig = defineConfig({
  default: 'app',

  /**
   * The loggers object can be used to define multiple loggers.
   * By default, we configure only one logger (named "app").
   */
  loggers: {
    app: {
      enabled: true,
      name: env.get('APP_NAME'),
      level: 'debug',
      transport: {
        targets: [
          ...targets()
            .pushIf(!app.inProduction, targets.pretty({}, env.get('LOG_LEVEL')))
            .pushIf(app.inProduction, targets.file({ destination: 1 }, env.get('LOG_LEVEL')))
            .toArray(),
          ...(env.get('AXIOM_DATASET') && env.get('AXIOM_TOKEN')
            ? [
                {
                  target: '@axiomhq/pino',
                  options: {
                    dataset: env.get('AXIOM_DATASET'),
                    token: env.get('AXIOM_TOKEN'),
                  },
                },
              ]
            : []),
        ],
      },
    },
  },
})

export default loggerConfig

/**
 * Inferring types for the list of loggers you have configured
 * in your application.
 */
declare module '@adonisjs/core/types' {
  export interface LoggersList extends InferLoggers<typeof loggerConfig> {}
}
