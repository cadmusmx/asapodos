import { redirect } from 'next/navigation'

import type { Locale } from '@configs/i18n'

import { requireViewAccess } from '@/lib/auth/require-view-access'
import { getLocalizedUrl } from '@/utils/i18n'

import TimeOffView from './page.client'

const Page = async (props: { params: Promise<{ lang: Locale }> }) => {
  const { lang } = await props.params

  const access = await requireViewAccess('vacation')

  if (!access.ok) {
    const target =
      access.reason === 'UNAUTHENTICATED'
        ? '/login'
        : '/pages/misc/401-not-authorized'

    redirect(getLocalizedUrl(target, lang))
  }

  return <TimeOffView />
}

export default Page
