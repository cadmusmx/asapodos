export const i18n = {
  defaultLocale: 'es',
  locales: ['es', 'en'],

  langDirection: {
    es: 'ltr',
    en: 'ltr'
  }
} as const

export type Locale = (typeof i18n)['locales'][number]
