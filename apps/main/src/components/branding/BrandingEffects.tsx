'use client'

import { useEffect } from 'react'

import { usePathname } from 'next/navigation'

import { useMe } from '@/hooks/useMe'
import { useInitialBranding } from '@/contexts/brandingContext'
import { erpNavigationModules, getDictionaryValue } from '@/lib/erp-navigation'

type Props = {
  dictionary: any
}

const BrandingEffects = ({ dictionary }: Props) => {
  const pathname = usePathname()
  const { data: meData } = useMe()
  const initialBranding = useInitialBranding()

  const faviconUrl = meData?.settings?.branding?.faviconUrl ?? initialBranding?.faviconUrl
  const displayName = meData?.settings?.branding?.displayName ?? initialBranding?.displayName
  const tenantName = meData?.tenant?.name

  useEffect(() => {
    if (!faviconUrl) return

    const existingShortcut = document.querySelector("link[rel='shortcut icon']")
    const existingIcon = document.querySelector("link[rel='icon']")

    const shortcut = existingShortcut ?? document.createElement('link')
    shortcut.rel = 'shortcut icon'
    shortcut.href = faviconUrl
    if (!existingShortcut) document.head.appendChild(shortcut)

    const icon = existingIcon ?? document.createElement('link')
    icon.rel = 'icon'
    icon.href = faviconUrl
    if (!existingIcon) document.head.appendChild(icon)

    return () => {
      shortcut.remove()
      icon.remove()
    }
  }, [faviconUrl])

  useEffect(() => {
    if (!meData) return

    const name = displayName || tenantName || 'Gaso'

    const segments = pathname.split('/')
    const hasLocale = ['en', 'es'].includes(segments[1])
    const pathWithoutLocale = hasLocale ? '/' + segments.slice(2).join('/') : pathname

    const navItem = erpNavigationModules
      .flatMap(m => m.items)
      .find(item => pathWithoutLocale === item.href || pathWithoutLocale.startsWith(item.href + '/'))

    let subtitle = name
    if (pathWithoutLocale === '/settings') {
      subtitle = getDictionaryValue(dictionary, 'settings.title')
    } else if (navItem?.labelKey) {
      subtitle = getDictionaryValue(dictionary, navItem.labelKey)
    }

    document.title = `${subtitle} | ${name}`
  }, [pathname, displayName, tenantName, dictionary])

  return null
}

export default BrandingEffects
