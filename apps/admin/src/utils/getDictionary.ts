import 'server-only'

export type Locale = 'es' | 'en'

const dictionaries = {
  es: () => import('@/data/dictionaries/es.json').then(module => module.default),
  en: () => import('@/data/dictionaries/en.json').then(module => module.default)
}

export const getDictionary = async (locale: Locale) => dictionaries[locale]()
