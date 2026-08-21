'use client'

import { createContext, useContext } from 'react'
import { getDictionaryValue } from '@/lib/erp-navigation'

const DEFAULT_LABELS: Record<string, string> = {
  'userMenu.myProfile': 'My Profile',
  'userMenu.settings': 'Settings',
  'userMenu.logout': 'Logout',
  'mode.light': 'Light',
  'mode.dark': 'Dark',
  'mode.system': 'System',
  'mode.lightMode': 'Light Mode',
  'mode.darkMode': 'Dark Mode',
  'mode.systemMode': 'System Mode'
}

type DictionaryContextValue = {
  dictionary: any
}

export const DictionaryContext = createContext<DictionaryContextValue>({ dictionary: null })

type Props = {
  dictionary: any
  children: React.ReactNode
}

export const DictionaryProvider = ({ dictionary, children }: Props) => {
  return <DictionaryContext.Provider value={{ dictionary }}>{children}</DictionaryContext.Provider>
}

export const useDictionary = () => {
  const ctx = useContext(DictionaryContext)

  return ctx.dictionary
}

export const useTranslate = () => {
  const dictionary = useDictionary()

  const t = (path: string, params?: Record<string, string | number>): string => {
    const key = path
    const resolved = dictionary ? getDictionaryValue(dictionary, `navbar.${path}`) : key

    if (resolved === `navbar.${path}`) {
      const defaultLabel = DEFAULT_LABELS[key] ?? key

      return params ? interpolate(defaultLabel, params) : defaultLabel
    }

    return params ? interpolate(resolved, params) : resolved
  }

  return { t }
}

const interpolate = (template: string, params: Record<string, string | number>): string => {
  return template.replace(/{(\w+)}/g, (_, key) => String(params[key] ?? `{${key}}`))
}
