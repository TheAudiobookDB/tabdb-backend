import Author from '#models/author'
import Narrator from '#models/narrator'
import Series from '#models/series'
import { identifierValidator } from '#validators/provider_validator'
import Identifier from '#models/identifier'
import Book from '#models/book'

export class ModelHelper {
  static async addIdentifier(model: Book | Author | Narrator | Series, payloadObject?: object[]) {
    if (payloadObject) {
      const identifiers = []
      for (const payload of payloadObject) {
        const identifier = await identifierValidator.validate(payload)
        if ('id' in identifier && identifier.id) {
          const existingIdentifier = await Identifier.findBy('public_id', identifier.id)
          if (existingIdentifier) {
            identifiers.push(existingIdentifier)
          }
        } else if ('type' in identifier) {
          const existingIdentifier = await Identifier.firstOrCreate({
            type: identifier.type,
            value: identifier.value,
          })
          if (existingIdentifier) {
            identifiers.push(existingIdentifier)
          }
        }
      }
      // @ts-ignore
      await model.related('identifiers').saveMany(identifiers)
    }
  }

  static async findByIdentifier(
    model: typeof Book | typeof Author | typeof Narrator | typeof Series,
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
  ): Promise<(Book | Author | Narrator | Series)[] | null> {
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
}
