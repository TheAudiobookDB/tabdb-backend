import { BaseSeeder } from '@adonisjs/lucid/seeders'
import axios from 'axios'
import { Audible } from '../../app/provider/audible.js'

export default class extends BaseSeeder {
  async run() {
    function sleep(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }

    for (let page = 1; page <= 20; page++) {
      const response = await axios.get('https://api.audible.com/1.0/catalog/products', {
        params: {
          num_results: 50,
          products_sort_by: 'Relevance',
          page: page,
        },
      })

      const products = response.data.products
      console.log(`Processing page ${page} with ${products.length} books`)

      for (const product of products) {
        console.log(`Fetching book with ASIN: ${product.asin}`)

        void Audible.fetchBook(product.asin, 'us')

        await sleep(401)
      }

      console.log(`Added 50 books from page ${page}`)
    }

    for (let page = 1; page <= 20; page++) {
      const response = await axios.get('https://api.audible.de/1.0/catalog/products', {
        params: {
          num_results: 50,
          products_sort_by: 'Relevance',
          page: page,
        },
      })

      const products = response.data.products
      console.log(`Processing page ${page} with ${products.length} books`)

      for (const product of products) {
        console.log(`Fetching book with ASIN: ${product.asin}`)

        void Audible.fetchBook(product.asin, 'de')

        await sleep(401)
      }

      console.log(`Added 50 books from page ${page}`)
    }
  }
}
