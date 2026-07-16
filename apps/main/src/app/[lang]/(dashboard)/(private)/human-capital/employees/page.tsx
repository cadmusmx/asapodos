import { redirect } from 'next/navigation'

import type { Locale } from '@configs/i18n'

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access'
import { getLocalizedUrl } from '@/utils/i18n'

import HumanCapitalView from './page.client'

const Page = async (props: { params: Promise<{ lang: Locale }> }) => {
  const { lang } = await props.params

  const access = await requireViewAccess('employees')

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang));
  }

  return <HumanCapitalView />
}

export default Page
