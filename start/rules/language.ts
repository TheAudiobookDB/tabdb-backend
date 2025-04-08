import type { FieldContext } from '@vinejs/vine/types'

import ISO6391, { LanguageCode } from 'iso-639-1'
import vine from '@vinejs/vine'

type Options = {
  strict?: boolean
}

async function languageRule(value: unknown, options: Options, field: FieldContext) {
  if (typeof value !== 'string') {
    return
  }

  const regex = /^[a-z]{2}(?:-[A-Z]{2})?$/
  if (regex.test(value)) {
    const [lang] = value.split('-')
    const langCode: LanguageCode = lang as LanguageCode
    if (ISO6391.getAllCodes().includes(langCode)) {
      return value
    }
  } else {
    const langCode = ISO6391.getCode(value)
    if (langCode) {
      field.value = langCode
      return value
    }
    switch (value) {
      case 'mandarin_chinese':
        field.value = 'zh'
        return field.value
      default:
        break
    }
  }

  if (!options.strict) {
    field.report(`Invalid language code (${value})`, 'language_validation', field)
  }
  field.value = null
  return null
}

export const isLanguageRule = vine.createRule(languageRule)
