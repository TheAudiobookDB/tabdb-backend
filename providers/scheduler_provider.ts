import type { ApplicationService } from '@adonisjs/core/types'
import { Worker } from 'adonisjs-scheduler'
import { hostname } from 'node:os'

export default class SchedulerProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {}

  /**
   * The container bindings have booted
   */
  async boot() {}

  /**
   * The application has been booted
   */
  async start() {}

  /**
   * The process has been started
   */
  async ready() {
    const [host, slot, id] = hostname().split('.')

    if ([host, slot, id].length === 3 && !Number.isNaN(Number(slot)) && Number(slot) !== 1) {
      console.info('Skipping scheduler worker startup for non-primary node')
      return
    }
    console.info('Starting scheduler worker')

    const worker = new Worker(this.app)

    this.app.terminating(async () => {
      await worker.stop()
    })

    await worker.start()
  }

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}
