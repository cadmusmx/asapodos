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
  'mode.systemMode': 'System Mode',
  'notifications.title': 'Notifications',
  'notifications.new': 'new',
  'notifications.markAllRead': 'Mark all as read',
  'notifications.markAllUnread': 'Mark all as unread',
  'notifications.viewAll': 'View All Notifications',
  'shortcuts.title': 'Shortcuts',
  'shortcuts.add': 'Add Shortcut',
  'search.placeholder': 'Search ⌘K',
  'search.navigate': 'to navigate',
  'search.open': 'to open',
  'search.close': 'to close',
  'search.noResult': 'No result for "{query}"',
  'search.trySearching': 'Try searching for',
  'tenant.label': 'Company:',
  'tenant.loading': 'Loading company...',
  'tenant.unavailable': 'Company unavailable'
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

export const useTranslatePage = () => {
  const dictionary = useDictionary()

  const t = (path: string, params?: Record<string, string | number>): string => {
    const resolved = path.split('.').reduce((currentValue, currentKey) => currentValue?.[currentKey], dictionary ?? {})

    if (typeof resolved !== 'string') {
      return params ? interpolate(path, params) : path
    }

    return params ? interpolate(resolved, params) : resolved
  }

  return { t }
}

const interpolate = (template: string, params: Record<string, string | number>): string => {
  return template.replace(/{(\w+)}/g, (_, key) => String(params[key] ?? `{${key}}`))
}
