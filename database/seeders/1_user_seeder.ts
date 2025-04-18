import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    const email = 'hello@theaudiobookdb.com'
    const publicId = 'aaaaaaaaaaaaaaaa'
    const fullName = 'System'
    await User.firstOrCreate(
      {
        email,
        username: 'system',
      },
      {
        publicId,
        fullName,
        email,
        role: 99,
      }
    )
  }
}
