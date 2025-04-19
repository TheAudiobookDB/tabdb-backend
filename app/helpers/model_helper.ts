import Contributor from '#models/contributor'
import Series from '#models/series'
import { identifierValidation } from '#validators/provider_validator'
import Identifier from '#models/identifier'
import Book from '#models/book'
import { Infer } from '@vinejs/vine/types'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'

export class ModelHelper {
  static async addIdentifier(
    model: Book | Contributor | Series,
    payloadObject?: Infer<typeof identifierValidation>[],
    trx?: TransactionClientContract,
    replace: boolean = false
  ) {
    if (payloadObject) {
      const identifiers = []
      for (const identifier of payloadObject) {
        if ('id' in identifier && identifier.id) {
          const existingIdentifier = await Identifier.findBy('public_id', identifier.id)
          if (existingIdentifier) {
            identifiers.push(existingIdentifier)
          }
        } else if ('type' in identifier) {
          const existingIdentifier = await Identifier.firstOrCreate(
            {
              type: identifier.type,
              value: identifier.value,
            },
            {},
            trx
              ? {
                  client: trx,
                }
              : undefined
          )
          if (existingIdentifier) {
            identifiers.push(existingIdentifier)
          }
        }
      }
      if (trx) model.useTransaction(trx)
      model.$pushRelated('identifiers', identifiers)
      if (replace) {
        const syncData = identifiers.reduce<Record<string, {}>>((acc, identifier) => {
          const key = identifier.id.toString()
          acc[key] = {}
          return acc
        }, {})

        // @ts-ignore
        await model.related('identifiers').sync(syncData)
      } else {
        // @ts-ignore
        await model.related('identifiers').saveMany(identifiers)
      }
    }
  }

  static async findByIdentifier(
    model: typeof Book | typeof Contributor | typeof Series,
    identifier?: string,
    type?: string,
    identifierObj?:
      | {
          id: string
        }
      | {
          type: 'audible:asin' | 'amazon:asin'
          value: string
        }
      | {
          type: 'isbn10'
          value: string
        }
      | {
          type: 'isbn13' | 'ean'
          value: string
        }
  ): Promise<(Book | Contributor | Series)[] | null> {
    const identifierModel = await Identifier.query()
      .where((builder) => {
        if (!identifierObj) {
          if (identifier) builder.where('value', identifier)
          if (type) builder.where('type', type)
        } else {
          if ('id' in identifierObj && identifierObj.id) {
            builder.where('id', identifierObj.id)
          } else if ('type' in identifierObj && 'value' in identifierObj) {
            builder.where('type', identifierObj.type).where('value', identifierObj.value)
          }
        }
      })
      .first()

    if (identifierModel) {
      return model
        .query()
        .preload('identifiers')
        .whereHas('identifiers', (query) => {
          query.where('identifiers.id', identifierModel.id)
        })
    }
    return null
  }

  static async findByIdentifiers(
    model: typeof Book | typeof Contributor | typeof Series,
    identifiers: Infer<typeof identifierValidation>[]
  ): Promise<(Book | Contributor | Series)[] | null> {
    if (identifiers.length > 0) {
      return model
        .query()
        .preload('identifiers')
        .whereHas('identifiers', (query) => {
          for (const identifier of identifiers) {
            if ('id' in identifier && identifier.id && typeof identifier.id === 'string') {
              query.orWhere('identifiers.id', identifier.id)
            } else if (
              'type' in identifier &&
              'value' in identifier &&
              identifier.type &&
              identifier.value &&
              typeof identifier.type === 'string' &&
              typeof identifier.value === 'string'
            ) {
              query
                .orWhere('identifiers.type', identifier.type)
                .where('identifiers.value', identifier.value)
            }
          }
        })
    }
    return null
  }

  static async findDuplicateBook(
    model: typeof Book | typeof Contributor | typeof Series,
    query: object
  ) {
    const filteredQuery = Object.fromEntries(
      Object.entries(query).filter(([_, value]) => value !== null && value !== undefined)
    )

    return model
      .query()
      .where((builder) => {
        for (const [key, value] of Object.entries(filteredQuery)) {
          builder.where(key, value)
        }
      })
      .first()
  }
}
