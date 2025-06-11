import { IdentifierType } from '../enum/identifier_enum.js'
import { Infer } from '@vinejs/vine/types'
import { allowedIdentifiers, identifierOpenAPIValidator } from '#validators/common_validator'

export class IdentifierValidator {
  private static isValidIsbn(isbn: string): string | null {
    const sanitizedIsbn = isbn.replace(/[-\s]/g, '')

    if (sanitizedIsbn.length === 10) {
      if (!/^\d{9}[\dX]$/i.test(sanitizedIsbn)) {
        return null
      }

      const chars = sanitizedIsbn.split('')
      const last = chars.pop()!.toUpperCase()

      let sum = 0
      for (let i = 0; i < 9; i++) {
        sum += (i + 1) * Number.parseInt(chars[i], 10)
      }

      const check = sum % 11
      const expectedCheckDigit = check === 10 ? 'X' : String(check)

      return last === expectedCheckDigit ? sanitizedIsbn.toUpperCase() : null
    }

    if (sanitizedIsbn.length === 13) {
      if (!/^97([89])\d{10}$/.test(sanitizedIsbn)) {
        return null
      }

      let sum = 0
      for (let i = 0; i < 12; i++) {
        const digit = Number.parseInt(sanitizedIsbn[i], 10)
        const weight = i % 2 === 0 ? 1 : 3
        sum += weight * digit
      }

      const check = (10 - (sum % 10)) % 10
      const lastDigit = Number.parseInt(sanitizedIsbn[12], 10)

      return check === lastDigit ? sanitizedIsbn : null
    }

    return null
  }

  static validate(
    identifier: Infer<typeof identifierOpenAPIValidator>,
    validationType: 'book' | 'contributor' | 'series'
  ): Infer<typeof identifierOpenAPIValidator> {
    if (identifier.id && (identifier.type || identifier.value)) {
      throw new Error(
        'The identifier field must not contain both id and type/value. Please use either id or type/value.'
      )
    }

    if (identifier.id) {
      return identifier
    }

    let { type, value, extra } = identifier
    value = value!
    type = type!
    if (!Object.values(IdentifierType).includes(type as IdentifierType)) {
      throw new Error(
        `The identifier field must be one of the allowed identifiers: ${allowedIdentifiers.join(', ')}`
      )
    }

    switch (type) {
      case IdentifierType.AmazonAsin:
      case IdentifierType.AudibleAsin:
        if (!['book', 'contributor', 'series'].includes(validationType)) {
          throw new Error(
            'The ASIN (Amazon Standard Identification Number) can only be used for books, contributors, or series.'
          )
        }
        if (!/^(B0[0-9A-Z]{8}|[0-9]{10})$/.test(value)) {
          throw new Error(
            'The identifier field must be a valid ASIN (Amazon Standard Identification Number).'
          )
        }
        const marketPlace = ['us', 'ca', 'uk', 'au', 'fr', 'de', 'jp', 'it', 'in', 'es', 'br']
        if (!extra || !marketPlace.includes(extra.toLowerCase())) {
          throw new Error(
            'The identifier field must have an extra field with the marketplace codes: ' +
              marketPlace.join(', ')
          )
        }
        extra = extra.toLowerCase()
        break

      case IdentifierType.AudibleSku:
        if (!['book'].includes(validationType)) {
          throw new Error(
            'The SKU (Stock Keeping Unit) can only be used for books or contributors.'
          )
        }
        if (!/^[A-Z]{2}_[A-Z]{4}_[0-9]{6}$/.test(value)) {
          throw new Error(
            'The identifier field must be a valid SKU (There are very few cases where the SKU has a different format. If so, please contact support). Format: AA_BBBB_123456'
          )
        }
        break

      case IdentifierType.Isbn:
      case IdentifierType.Ean:
        if (!['book'].includes(validationType)) {
          throw new Error(
            'The ISBN (International Standard Book Number) / EAN (European Article Number) can only be used for books.'
          )
        }
        if (this.isValidIsbn(value) === null) {
          throw new Error(
            'The identifier field must be a valid ISBN (10 or 13 digits, with optional hyphens or spaces) / EAN (European Article Number).'
          )
        }
        break

      case IdentifierType.GoogleId:
        if (!['book', 'contributor'].includes(validationType)) {
          throw new Error('The Google ID can only be used for books or contributors.')
        }
        if (!/^[a-zA-Z0-9]{12}$/.test(value)) {
          throw new Error(
            'The identifier field must be a valid Google ID (12 characters long, alphanumeric).'
          )
        }
        break

      case IdentifierType.Gnd:
        if (!['contributor'].includes(validationType)) {
          throw new Error('The GND (Gemeinsame Normdatei) can only be used for contributors.')
        }
        if (!/^[0-9]{8}$/.test(value)) {
          throw new Error(
            'The identifier field must be a valid GND (Gemeinsame Normdatei) identifier (8 digits).'
          )
        }
        break

      case IdentifierType.Isni:
        if (!['contributor'].includes(validationType)) {
          throw new Error(
            'The ISNI (International Standard Name Identifier) can only be used for contributors.'
          )
        }
        if (!/^[0-9]{16}$/.test(value)) {
          throw new Error(
            'The identifier field must be a valid ISNI (International Standard Name Identifier) (16 digits).'
          )
        }
        break

      case IdentifierType.GoodreadsId:
        if (!['book', 'contributor', 'series'].includes(validationType)) {
          throw new Error('The Goodreads ID can only be used for books or contributors or series.')
        }
        if (!/^[0-9]{1,10}$/.test(value)) {
          throw new Error('The identifier field must be a valid Goodreads ID (1 to 10 digits).')
        }
        break

      case IdentifierType.musicbrainzId:
        if (!['book'].includes(validationType)) {
          throw new Error(
            'The MusicBrainz ISBN can only be used for books (International Standard Book Number).'
          )
        }
        if (
          !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
            value
          )
        ) {
          throw new Error(
            'The identifier field must be a valid MusicBrainz UUID (e\.g\. 123e4567-e89b-12d3-a456-426614174000).'
          )
        }
        break

      case IdentifierType.WikipediaId:
        if (!['book', 'contributor'].includes(validationType)) {
          throw new Error('The Wikipedia ID can only be used for books or contributors.')
        }
        if (!/^[0-9]{1,10}$/.test(value)) {
          throw new Error('The identifier field must be a valid Wikipedia ID (1 to 10 digits).')
        }
        break

      case IdentifierType.WikidataId:
        if (!['contributor'].includes(validationType)) {
          throw new Error('The Wikidata ID can only be used for books or contributors.')
        }
        if (!/^Q[0-9]{1,9}$/.test(value)) {
          throw new Error(
            'The identifier field must be a valid Wikidata ID (starts with Q followed by digits).'
          )
        }
        break

      case IdentifierType.Instagram:
      case IdentifierType.Twitter:
      case IdentifierType.Facebook:
      case IdentifierType.TikTok:
      case IdentifierType.YouTube:
      case IdentifierType.LinkedIn:
        if (!['contributor'].includes(validationType)) {
          throw new Error(`The ${type} identifier can only be used for contributors.`)
        }
        if (!/^[a-zA-Z0-9._-]{1,30}$/.test(value)) {
          throw new Error(
            `The identifier field must be a valid ${type} username (1 to 30 characters, alphanumeric, underscores, hyphens, and periods allowed).`
          )
        }
        break

      case IdentifierType.Mastodon:
      case IdentifierType.Bluesky:
        if (!['contributor'].includes(validationType)) {
          throw new Error(`The ${type} identifier can only be used for contributors.`)
        }
        if (!/^@?[a-zA-Z0-9._-]{1,50}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,100}$/.test(value)) {
          throw new Error(
            `The identifier field must be a valid ${type} handle (username@server.domain format, with a valid server domain required).`
          )
        }
        break

      case IdentifierType.Audiobooks:
      case IdentifierType.RTL:
      case IdentifierType.Deezer:
      case IdentifierType.Tidal:
        if (!['book'].includes(validationType)) {
          throw new Error(`The ${type} identifier can only be used for books.`)
        }
        if (!/^[0-9]{1,10}$/.test(value)) {
          throw new Error(
            `The identifier field must be a valid ${type} identifier (1 to 10 digits).`
          )
        }
        break

      case IdentifierType.AppleBooks:
        if (!['book', 'contributor', 'series'].includes(validationType)) {
          throw new Error(
            `The ${type} identifier can only be used for books, contributors, or series.`
          )
        }
        if (!/^id[0-9]{9}$/.test(value)) {
          throw new Error(
            `The identifier field must be a valid ${type} identifier (starts with 'id' followed by 9 digits).`
          )
        }
        break

      case IdentifierType.BookMate:
        if (!['book', 'contributor'].includes(validationType)) {
          throw new Error(`The ${type} identifier can only be used for books or contributors.`)
        }
        if (!/^[a-zA-Z0-9]{8}$/.test(value)) {
          throw new Error(
            `The identifier field must be a valid ${type} identifier (8 alphanumeric characters).`
          )
        }
        break

      case IdentifierType.DownPour:
        if (!['book'].includes(validationType)) {
          throw new Error(`The ${type} identifier can only be used for books.`)
        }
        if (!/^[0-9]{6}$/.test(value)) {
          throw new Error(`The identifier field must be a valid ${type} identifier (6 digits).`)
        }
        break

      case IdentifierType.Storytel:
        if (!['book', 'contributor', 'series'].includes(validationType)) {
          throw new Error(
            `The ${type} identifier can only be used for books, contributors, or series.`
          )
        }
        if (!/^[0-9]{1,7}$/.test(value)) {
          throw new Error(
            `The identifier field must be a valid ${type} identifier (1 to 7 digits).`
          )
        }
        break

      case IdentifierType.Spotify:
        if (!['book', 'contributor'].includes(validationType)) {
          throw new Error(
            `The ${type} identifier can only be used for books, contributors, or series.`
          )
        }
        if (!/^[a-zA-Z0-9]{22}$/.test(value)) {
          throw new Error(
            `The identifier field must be a valid ${type} identifier (22 alphanumeric characters).`
          )
        }
        break

      case IdentifierType.Scribd:
        if (!['book', 'contributor'].includes(validationType)) {
          throw new Error(`The ${type} identifier can only be used for books or contributors.`)
        }
        if (!/^[0-9]{9}$/.test(value)) {
          throw new Error(`The identifier field must be a valid ${type} identifier (9 digits).`)
        }
        break

      case IdentifierType.Qobuz:
        if (!['book', 'contributor'].includes(validationType)) {
          throw new Error(`The ${type} identifier can only be used for books or contributors.`)
        }
        if (!/^[a-zA-Z0-9]{13}|[0-9]{4,8}$/.test(value)) {
          throw new Error(
            `The identifier field must be a valid ${type} identifier (13 alphanumeric characters or 4 to 8 digits).`
          )
        }
        break

      case IdentifierType.Thalia:
        if (!['book', 'contributor'].includes(validationType)) {
          throw new Error(`The ${type} identifier can only be used for books or contributors.`)
        }
        if ('contributor' === validationType && !/^[0-9]{7}$/.test(value)) {
          throw new Error(`The identifier field must be a valid ${type} identifier (7 digits).`)
        }
        if ('book' === validationType && !/^A[0-9]{10}$/.test(value)) {
          throw new Error(
            `The identifier field must be a valid ${type} identifier (starts with 'A' followed by 10 digits).`
          )
        }
        break
    }

    return { type, value, extra }
  }

  static validateMany(
    identifiers?: Infer<typeof identifierOpenAPIValidator>[],
    validationType: 'book' | 'contributor' | 'series' = 'book'
  ): Infer<typeof identifierOpenAPIValidator>[] | undefined {
    if (!identifiers) return identifiers
    return identifiers.map((identifier) => {
      return this.validate(identifier, validationType)
    })
  }
}
