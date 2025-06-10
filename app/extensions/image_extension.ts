// @ts-ignore
import { computed } from '@adonisjs/lucid/orm'
import { imageTypes } from '#config/app'
import env from '#start/env'

type Constructor<T = {}> = new (...args: any[]) => T

export function ImageExtension<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    // @ts-ignore
    @computed({ serializeAs: 'image' })
    public get imageUrl(): Record<string, string> | null {
      // @ts-ignore
      if (!this.image) {
        return null
      }
      return imageTypes.reduce(
        (map, type) => {
          // @ts-ignore
          map[type] = this.image.startsWith(env.get('CDN_SERVE_HOST'))
            ? // @ts-ignore
              `${this.image}?s=${type}`
            : // @ts-ignore
              `${env.get('CDN_SERVE_HOST')}/${this.image}?s=${type}`
          return map
        },
        {} as Record<string, string>
      )
    }
  }
}
