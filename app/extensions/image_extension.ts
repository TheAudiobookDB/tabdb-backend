// @ts-ignore
import { computed } from '@adonisjs/lucid/orm'
import { imageTypes } from '#config/app'

type Constructor<T = {}> = new (...args: any[]) => T

export function ImageExtension<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    // @ts-ignore
    @computed({ serializeAs: 'image' })
    public get imageUrl(): Record<string, string> | null | undefined {
      // @ts-ignore
      if (this.image === undefined) return undefined
      // @ts-ignore
      if (this.image === null) return null
      return imageTypes.reduce(
        (map, type) => {
          // @ts-ignore
          map[type] = `${this.image}?s=${type}`
          return map
        },
        {} as Record<string, string>
      )
    }
  }
}
