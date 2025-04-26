import { BaseSeeder } from '@adonisjs/lucid/seeders'
import axios from 'axios'
import { Audible } from '../../app/provider/audible.js'
import Book from '#models/book'
import { ContributorType } from '../../app/enum/contributor_enum.js'
import env from '#start/env'

export default class extends BaseSeeder {
  async run() {
    function sleep(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }

    for (let page = 1; page < env.get('SEED_NUM', 5); page++) {
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

        try {
          void Audible.fetchBook(product.asin, 'us')
        } catch (e) {
          console.error(`Error fetching book ${product.asin}:`, e.message)
        }

        await sleep(401)
      }

      console.log(`Added 50 books from page ${page}`)
    }

    for (let page = 1; page < env.get('SEED_NUM', 5); page++) {
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

        try {
          void Audible.fetchBook(product.asin, 'de')
        } catch (e) {
          console.error(`Error fetching book ${product.asin}:`, e.message)
        }

        await sleep(401)
      }

      console.log(`Added 50 books from page ${page}`)
    }

    const books = await Book.query()
      .preload('contributors', (q) =>
        q
          .pivotColumns(['role', 'type'])
          .preload('identifiers', (q2) => q2.where('type', 'audible:asin'))
          .where('type', ContributorType.AUTHOR)
      )
      .orderByRaw('RANDOM()')

    const authors: string[] = []

    for (const book of books) {
      for (const author of book.contributors) {
        for (const identifier of author.identifiers) {
          if (identifier.type === 'audible:asin') {
            authors.push(identifier.value)
          }
        }
      }
    }

    const authorsSet = new Set(authors)
    let authorsArray = Array.from(authorsSet)

    authorsArray = authorsArray.slice(0, env.get('SEED_NUM', 5) * 10)

    for (const author of authorsArray) {
      try {
        await Audible.fetchAuthor(author, 'us')
      } catch (e) {
        console.error(`Error fetching author ${author}:`, e.message)
      }

      await sleep(401)
    }
  }
}
