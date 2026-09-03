'use client'

import { useEffect } from 'react'

import { usePathname, useRouter } from 'next/navigation'

import type { Locale } from '@configs/i18n'

import themeConfig from '@configs/themeConfig'

import { getLocalizedUrl } from '@/utils/i18n'

const AuthRedirect = ({ lang }: { lang: Locale }) => {
  const pathname = usePathname()
  const router = useRouter()
  const redirectUrl = `/${lang}/login?redirectTo=${pathname}`
  const login = `/${lang}/login`
  const homePage = getLocalizedUrl(themeConfig.homePageUrl, lang)
  const target = pathname === login ? login : pathname === homePage ? login : redirectUrl

  useEffect(() => {
    router.replace(target)
  }, [router, target])

  return null
}

export default AuthRedirect
