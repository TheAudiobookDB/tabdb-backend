import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    const email = 'hello@theaudiobookdb.com'
    const publicId = 'AAAAAAAAAAAAAAAA'
    const fullName = 'System'
    await User.firstOrCreate(
      {
        email,
      },
      {
        publicId,
        fullName,
        email,
      }
    )
  }
}
